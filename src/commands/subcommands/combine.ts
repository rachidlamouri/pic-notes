/**
 * @file
 * @see https://pyokagan.name/blog/2019-10-14-png/
 */

import { ParseableType } from '../../parse-args/parseableType';
import { parseArgs } from '../../parse-args/parseArgs';
import { assertIsNotNull } from '../../utils/assertIsNotNull';
import { Command } from '../command';
import { CommandName } from '../commandName';
import fs from 'fs';
import zlib from 'node:zlib';
import { PicturesManager } from '../picturesManager';
import { withExit } from '../withExit';
import { readFile } from 'fs/promises';
import { Timer } from '../../utils/timer';
import { assertIsNotUndefined } from '../../utils/assertIsNotUndefined';
import { printMetaList } from '../print';

type Chunk = {
  isCritical: boolean;
  length: number;
  data: Buffer;
  type: string;
};

type Pixel = [number, number, number, number];
type Scanline = Pixel[];

type Image = {
  scanlines: Scanline[];
  width: number;
  height: number;
};

const expectedPNGSignature = '\x89PNG\r\n\x1a\n';

const toUInt32 = (value: number) => {
  const buffer = Buffer.from(new Uint8Array(4));
  buffer.writeUInt32BE(value);

  return buffer;
};

const encodeCrc = (type: string, data: Buffer) => {
  return zlib.crc32(data, zlib.crc32(type));
};

const paethPredictor = (
  previousPixelByte: number,
  previousScanlineByte: number,
  previousScanlinePreviousPixelByte: number,
) => {
  const idk =
    previousPixelByte +
    previousScanlineByte -
    previousScanlinePreviousPixelByte;

  const idkPreviousPixelByte = Math.abs(idk - previousPixelByte);
  const idkPreviousScanlineByte = Math.abs(idk - previousScanlineByte);
  const idkPreviousScanlinePreviousPixelByte = Math.abs(
    idk - previousScanlinePreviousPixelByte,
  );

  const min = Math.min(
    idkPreviousPixelByte,
    idkPreviousScanlineByte,
    idkPreviousScanlinePreviousPixelByte,
  );

  if (min === idkPreviousPixelByte) {
    return previousPixelByte;
  } else if (min === idkPreviousScanlineByte) {
    return previousScanlineByte;
  } else {
    return previousScanlinePreviousPixelByte;
  }
};

const reconstructByte = (
  reconstructedScanlines: Scanline[],
  filterType: number,
  filteredByte: number,
  scanlineIndex: number,
  pixelIndex: number,
  byteIndex: number,
) => {
  const scanline = reconstructedScanlines[scanlineIndex];
  const previousScanline = reconstructedScanlines[scanlineIndex - 1];

  const previousPixel = scanline?.[pixelIndex - 1];
  const previousScanlinePixel = previousScanline?.[pixelIndex];
  const previousScanlinePreviousPixel = previousScanline?.[pixelIndex - 1];

  const previousPixelByte = previousPixel?.[byteIndex] ?? 0;
  const previousScanlinePixelByte = previousScanlinePixel?.[byteIndex] ?? 0;
  const previousScanlinePreviousPixelByte =
    previousScanlinePreviousPixel?.[byteIndex] ?? 0;

  let value: number;
  if (filterType === 0) {
    // none
    value = filteredByte;
  } else if (filterType === 1) {
    // sub
    value = filteredByte + previousPixelByte;
  } else if (filterType === 2) {
    // up
    value = filteredByte + previousScanlinePixelByte;
  } else if (filterType === 3) {
    // average
    value =
      filteredByte +
      Math.floor((previousPixelByte + previousScanlinePixelByte) / 2);
  } else if (filterType === 4) {
    // paeth
    value =
      filteredByte +
      paethPredictor(
        previousPixelByte,
        previousScanlinePixelByte,
        previousScanlinePreviousPixelByte,
      );
  } else {
    throw new Error(`Invalid filter type ${filterType}`);
  }

  return value % 256;
};

const decodeChunk = (
  buffer: Buffer,
  initialOffset: number,
): { chunk: Chunk; nextOffset: number } => {
  let offset = initialOffset;

  const length = buffer.readUInt32BE(offset);
  offset += 4;

  const type = [
    String.fromCharCode(buffer.readUInt8(offset + 0)),
    String.fromCharCode(buffer.readUInt8(offset + 1)),
    String.fromCharCode(buffer.readUInt8(offset + 2)),
    String.fromCharCode(buffer.readUInt8(offset + 3)),
  ].join('');
  offset += 4;

  const data = buffer.subarray(offset, offset + length);
  offset += length;

  const crc = buffer.readUInt32BE(offset);
  offset += 4;

  const isCritical = type.charAt(0).toUpperCase() === type.charAt(0);

  const expectedCrc = encodeCrc(type, data);

  if (crc !== expectedCrc) {
    throw new Error(
      `Corrupted ${type} chunk. Expected: ${expectedCrc}. Received: ${crc}`,
    );
  }

  return {
    chunk: {
      isCritical,
      length,
      type,
      data,
    },
    nextOffset: offset,
  };
};

const decodeImageHeader = (data: Buffer) => {
  let offset = 0;

  const width = data.readUInt32BE(offset);
  offset += 4;

  const height = data.readUInt32BE(offset);
  offset += 4;

  const bitDepth = data.readUInt8(offset);
  offset += 1;

  const colorType = data.readUInt8(offset);
  offset += 1;

  const compressionMethod = data.readUInt8(offset);
  offset += 1;

  const filterMethod = data.readUInt8(offset);
  offset += 1;

  const interlaceMethod = data.readUInt8(offset);
  offset += 1;

  return {
    width,
    height,
    bitDepth,
    colorType,
    compressionMethod,
    filterMethod,
    interlaceMethod,
  };
};

const decodeImage = (fileBuffer: Buffer) => {
  let offset = 0;

  const signature = Array.from({ length: 8 }).map((_, index) => {
    return fileBuffer.readUInt8(offset + index);
  });

  offset += 8;

  if (
    !signature.every(
      (value, index) =>
        String.fromCharCode(value) === expectedPNGSignature.charAt(index),
    )
  ) {
    const toList = (b: Buffer) => {
      const list = [];
      for (const x of b) {
        list.push(x.toString().padStart(3, ' '));
      }

      return list;
    };

    throw new Error(`Invalid PNG signature.`);
  }

  let headerChunk: Chunk | null = null;
  let endChunk: Chunk | null = null;

  const dataChunks: Chunk[] = [];
  while (offset < fileBuffer.length) {
    const { chunk, nextOffset } = decodeChunk(fileBuffer, offset);

    if (chunk.isCritical) {
      if (chunk.type === 'IHDR') {
        headerChunk = chunk;
      } else if (chunk.type === 'IEND') {
        endChunk = chunk;
      } else if (chunk.type === 'IDAT') {
        dataChunks.push(chunk);
      } else {
        throw new Error(`Unknown chunk type: ${chunk.type}`);
      }
    }

    offset = nextOffset;
  }

  assertIsNotNull(headerChunk);
  assertIsNotNull(endChunk);

  const header = decodeImageHeader(headerChunk.data);

  if (
    header.bitDepth !== 8 ||
    (header.colorType !== 6 && header.colorType !== 2) ||
    header.compressionMethod !== 0 ||
    header.filterMethod !== 0 ||
    header.interlaceMethod !== 0
  ) {
    console.log(header);
    throw new Error(
      `Only color types 6 and 2 (with and without alpha respectively) is supported with 8 bit depth, deflate compression, adaptive filtering, and no interlace. Received: ${JSON.stringify(header, null, 2)}`,
    );
  }

  const compressedDataBuffer = Buffer.concat(
    dataChunks.map(({ data }) => data),
  );
  const dataBuffer = zlib.inflateSync(compressedDataBuffer);

  const bytesPerFilter = 1;
  const bytesPerPixel = header.colorType === 6 ? 4 : 3;
  const pixelsPerScanline = header.width;
  const bytesPerScanline = pixelsPerScanline * bytesPerPixel;

  const scanlineCount = header.height;
  const bytesPerFilteredScanline = bytesPerFilter + bytesPerScanline;
  const expectedDataLength = scanlineCount * bytesPerFilteredScanline;

  if (dataBuffer.length !== expectedDataLength) {
    throw new Error(
      `Invalid image data size. Expected ${expectedDataLength}, but recieved ${dataBuffer.length}`,
    );
  }

  const allFilterTypes = new Set();
  const filteredScanlines = Array.from({ length: scanlineCount }).map(
    (_, scanlineIndex) => {
      let offset = bytesPerFilteredScanline * scanlineIndex;

      const filterType = dataBuffer.readUInt8(offset);
      allFilterTypes.add(filterType);
      offset += 1;

      const filteredPixels = Array.from({ length: pixelsPerScanline }).map(
        (_, pixelOffset) => {
          const byteOffset = pixelOffset * bytesPerPixel;

          const filteredPixel: Pixel = [
            dataBuffer.readUInt8(offset + byteOffset + 0),
            dataBuffer.readUInt8(offset + byteOffset + 1),
            dataBuffer.readUInt8(offset + byteOffset + 2),
            bytesPerPixel === 3
              ? 255
              : dataBuffer.readUInt8(offset + byteOffset + 3),
          ];

          return filteredPixel;
        },
      );
      offset += bytesPerScanline;

      return {
        type: filterType,
        pixels: filteredPixels,
      };
    },
  );

  const reconstructedScanlines: Scanline[] = [];
  filteredScanlines.forEach((filteredScanline, scanlineIndex) => {
    const reconstructedScanline: Scanline = [];
    reconstructedScanlines.push(reconstructedScanline);

    filteredScanline.pixels.forEach((filteredPixel, pixelIndex) => {
      const reconstructedPixel: Pixel = [
        reconstructByte(
          reconstructedScanlines,
          filteredScanline.type,
          filteredPixel[0],
          scanlineIndex,
          pixelIndex,
          0,
        ),
        reconstructByte(
          reconstructedScanlines,
          filteredScanline.type,
          filteredPixel[1],
          scanlineIndex,
          pixelIndex,
          1,
        ),
        reconstructByte(
          reconstructedScanlines,
          filteredScanline.type,
          filteredPixel[2],
          scanlineIndex,
          pixelIndex,
          2,
        ),
        bytesPerPixel === 3
          ? 255
          : reconstructByte(
              reconstructedScanlines,
              filteredScanline.type,
              filteredPixel[3],
              scanlineIndex,
              pixelIndex,
              3,
            ),
      ];

      reconstructedScanline.push(reconstructedPixel);

      return reconstructedPixel;
    });
  });

  return {
    scanlines: reconstructedScanlines,
    width: header.width,
    height: header.height,
  };
};

const encodeImage = (image: Image) => {
  const encodeTimer = new Timer().restart();
  const crc = Buffer.from(new Uint8Array(4)).fill(255);

  const signature = Buffer.from(
    expectedPNGSignature.split('').map((letter) => letter.charCodeAt(0)),
  );

  encodeTimer.logElapsedSeconds('signature');

  const headerData = Buffer.concat([
    toUInt32(image.width),
    toUInt32(image.height),
    // bit depth, color type, compression, filter, interlace
    Buffer.from([8, 6, 0, 0, 0]),
  ]);

  encodeTimer.logElapsedSeconds('header data');

  const headerChunk = Buffer.concat([
    toUInt32(headerData.length),
    Buffer.from('IHDR'),
    headerData,
    toUInt32(encodeCrc('IHDR', headerData)),
  ]);

  encodeTimer.logElapsedSeconds('header chunk');

  const filteredScanlines: number[] = [];
  for (const scanline of image.scanlines) {
    filteredScanlines.push(0);
    for (const pixel of scanline) {
      for (const value of pixel) {
        filteredScanlines.push(value);
      }
    }
  }

  encodeTimer.logElapsedSeconds('filtered scanlines');
  const dataBuffer = Buffer.from(filteredScanlines);
  encodeTimer.logElapsedSeconds('data buffer');
  const compressedBuffer = zlib.deflateSync(dataBuffer);
  encodeTimer.logElapsedSeconds('compressed buffer');
  const dataChunk = Buffer.concat([
    toUInt32(compressedBuffer.length),
    Buffer.from('IDAT'),
    compressedBuffer,
    toUInt32(encodeCrc('IDAT', compressedBuffer)),
  ]);
  encodeTimer.logElapsedSeconds('data chunk');

  const endChunk = Buffer.concat([
    toUInt32(0),
    Buffer.from('IEND'),
    toUInt32(encodeCrc('IEND', Buffer.from([]))),
  ]);
  encodeTimer.logElapsedSeconds('end chunk');

  const imageBuffer = Buffer.concat([
    signature,
    headerChunk,
    dataChunk,
    endChunk,
  ]);

  encodeTimer.logElapsedSeconds('image buffer');

  return imageBuffer;
};

export class Combine extends Command<CommandName.Combine> {
  name = CommandName.Combine as const;
  description =
    'Combines multiple images into one. The "latest" flag will combine the last n1 images from earliest to latest. The latest range is offset by "offset" (defaults to 0). The append flag will overwrite the first image and preserve its metadata.';
  examples = [
    '<id1> <id2> [<id3>...] [--append] --horizontal',
    '<id1> <id2> [<id3>...] [--append] --vertical',
    '--latest <n1> [--offset <n2>] [--horizontal] [--vertical]',
  ];

  run(commandArgs: string[]): void {
    const {
      positionals: explicitInputIds,
      options: {
        horizontal: isHorizontal,
        vertical: isVertical,
        latest: latestInputIdCount,
        offset: inputOffset,
        append: isAppend,
      },
    } = parseArgs({
      args: commandArgs,
      positionals: [],
      options: [
        {
          type: ParseableType.Number,
          name: 'offset',
        },
        {
          type: ParseableType.Number,
          name: 'latest',
        },
        {
          type: ParseableType.Boolean,
          name: 'horizontal',
        },
        {
          type: ParseableType.Boolean,
          name: 'vertical',
        },
        {
          type: ParseableType.Boolean,
          name: 'append',
        },
      ],
    } as const);

    const hasExplicitInputIds = explicitInputIds.length > 0;
    const hasImplicitInputIds = latestInputIdCount !== undefined;
    const hasOffset = inputOffset !== undefined;

    if (
      (hasExplicitInputIds && hasImplicitInputIds) ||
      (!hasExplicitInputIds && !hasImplicitInputIds)
    ) {
      console.log('Must provider either "latest" or image ids');
      withExit(1, this.printUsage.bind(this));
    }

    if (hasExplicitInputIds && explicitInputIds.length < 2) {
      console.log('Must provide two or more image ids');
      withExit(1, this.printUsage.bind(this));
    }

    if (
      hasImplicitInputIds &&
      (latestInputIdCount < 2 || latestInputIdCount > 10)
    ) {
      console.log('Latest must be a number between 2 and 10 inclusive');
      withExit(1, this.printUsage.bind(this));
    }

    if ((isHorizontal && isVertical) || (!isHorizontal && !isVertical)) {
      console.log('Must provide exactly one of "horizontal" or "vertical"');
      withExit(1, this.printUsage.bind(this));
    }

    if (hasOffset && !hasImplicitInputIds) {
      console.log('Must provide "latest" when using "offset"');
      withExit(1, this.printUsage.bind(this));
    }

    if (hasOffset && inputOffset < 0) {
      console.log('Offset must be greater than or equal to zero');
      withExit(1, this.printUsage.bind(this));
    }

    const offset = inputOffset ?? 0;
    const latestInputIds = hasImplicitInputIds
      ? Object.values(this.metadataManager.metadata.metaById)
          .slice(-latestInputIdCount - offset, -offset || undefined)
          .map((meta) => meta.id)
      : [];

    const allInputIds = [...explicitInputIds, ...latestInputIds];

    const parsedIds = allInputIds.map((id) => Command.parseInputId(id));
    const metaList = parsedIds.map((id) => {
      return this.metadataManager.getMetaById(id);
    });

    const allDecodeTimer = new Timer().restart();
    const doAsync = async () => {
      const subimages = await Promise.all(
        metaList.map((meta) => {
          const decodeTimer = new Timer().restart();
          console.log(`  decoding: ${meta.filePath}`);
          return readFile(meta.filePath).then((buffer) => {
            decodeTimer.logElapsedSeconds(
              `FINSISHED DECODING ${meta.filePath}`,
            );
            const image = decodeImage(buffer);
            return image;
          });
        }),
      );
      allDecodeTimer.logElapsedSeconds('FINISHED DECODING ALL');

      const DEFAULT_PIXEL: Pixel = [0, 0, 0, 0];

      let finalImage: Image;
      if (isHorizontal) {
        const finalImageWidth = subimages
          .map((image) => image.width)
          .reduce((sum, next) => sum + next, 0);

        const finalImageHeight = Math.max(
          ...subimages.map((image) => image.height),
        );
        const scanlines = Array.from({ length: finalImageHeight }).map(
          (_, lineIndex) => {
            return subimages.flatMap((image) => {
              const subimageLine =
                image.scanlines[lineIndex] ??
                Array.from({ length: image.width }).map(() => DEFAULT_PIXEL);

              return subimageLine;
            });
          },
        );

        finalImage = {
          width: finalImageWidth,
          height: finalImageHeight,
          scanlines,
        };
      } else {
        const finalImageWidth = Math.max(
          ...subimages.map((image) => image.width),
        );
        const finalImageHeight = subimages
          .map((image) => image.height)
          .reduce((sum, next) => sum + next, 0);

        const templateRow = Array.from({ length: finalImageWidth }).map(
          (_, index) => index,
        );

        finalImage = {
          width: finalImageWidth,
          height: finalImageHeight,
          scanlines: subimages.flatMap((image) => {
            return image.scanlines.map((scanline) => {
              return templateRow.map((index) => {
                return scanline[index] ?? DEFAULT_PIXEL;
              });
            });
          }),
        };
      }

      console.log('  encoding final image');
      const encodedFinalImage = encodeImage(finalImage);

      let newImageFilePath;
      let filePathToBackupSingleton: [string] | [];
      let filesPathsToRecycle: string[];
      if (isAppend) {
        const [firstMeta, ...otherMeta] = metaList;
        assertIsNotUndefined(firstMeta);
        filePathToBackupSingleton = [
          PicturesManager.createTemporaryBackup(firstMeta.filePath),
        ];

        newImageFilePath = firstMeta.filePath;
        PicturesManager.overwritePicture(newImageFilePath, encodedFinalImage);
        this.metadataManager.merge(metaList);

        filesPathsToRecycle = otherMeta
          .filter((meta) => meta.tagMap.size === 0)
          .map((meta) => meta.filePath);
      } else {
        newImageFilePath = PicturesManager.createPicture(encodedFinalImage);
        filePathToBackupSingleton = [];
        filesPathsToRecycle = metaList.map((meta) => meta.filePath);
      }

      const recycledFilePaths =
        PicturesManager.recyclePictures(filesPathsToRecycle);

      console.log(`  backed up images:`);
      [...filePathToBackupSingleton, ...recycledFilePaths].forEach(
        (filePath) => {
          console.log(`    ./${filePath}`);
        },
      );
      console.log(`  encoded final image: ./${newImageFilePath}`);

      if (isAppend) {
        console.log();
        printMetaList(metaList, this.metadataManager);
      }
    };

    doAsync().catch((error) => {
      console.log(error);
    });
  }
}
