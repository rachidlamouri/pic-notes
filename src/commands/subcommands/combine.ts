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
  // @ts-ignore -- need to find the tsconfig that has updated node types
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
    header.colorType !== 6 ||
    header.compressionMethod !== 0 ||
    header.filterMethod !== 0 ||
    header.interlaceMethod !== 0
  ) {
    console.log(header);
    throw new Error(
      `Only truecolor with alpha color type (6) is supported with 8 bit depth, deflate compression, adaptive filtering, and no interlace. Received: ${header}`,
    );
  }

  const compressedDataBuffer = Buffer.concat(
    dataChunks.map(({ data }) => data),
  );
  const dataBuffer = zlib.inflateSync(compressedDataBuffer);

  const bytesPerFilter = 1;
  const bytesPerPixel = 4;
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
            dataBuffer.readUInt8(offset + byteOffset + 3),
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
        reconstructByte(
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
  const crc = Buffer.from(new Uint8Array(4)).fill(255);

  const signature = Buffer.from(
    expectedPNGSignature.split('').map((letter) => letter.charCodeAt(0)),
  );

  const headerData = Buffer.concat([
    toUInt32(image.width),
    toUInt32(image.height),
    // bit depth, color type, compression, filter, interlace
    Buffer.from([8, 6, 0, 0, 0]),
  ]);

  const headerChunk = Buffer.concat([
    toUInt32(headerData.length),
    Buffer.from('IHDR'),
    headerData,
    toUInt32(encodeCrc('IHDR', headerData)),
  ]);

  const filteredScanlines = image.scanlines.flatMap((scanline) => [
    0,
    ...scanline.flat(),
  ]);
  const dataBuffer = Buffer.from(filteredScanlines);
  const compressedBuffer = zlib.deflateSync(dataBuffer);
  const dataChunk = Buffer.concat([
    toUInt32(compressedBuffer.length),
    Buffer.from('IDAT'),
    compressedBuffer,
    toUInt32(encodeCrc('IDAT', compressedBuffer)),
  ]);

  const endChunk = Buffer.concat([
    toUInt32(0),
    Buffer.from('IEND'),
    toUInt32(encodeCrc('IEND', Buffer.from([]))),
  ]);

  const imageBuffer = Buffer.concat([
    signature,
    headerChunk,
    dataChunk,
    endChunk,
  ]);

  return imageBuffer;
};

export class Combine extends Command<CommandName.Combine> {
  name = CommandName.Combine as const;
  description = 'Combines multiple images into one';
  examples = [
    '<id1> <id2> [<id3>...] --horizontal',
    '<id1> <id2> [<id3>...] --vertical',
  ];

  run(commandArgs: string[]): void {
    const {
      positionals: inputIds,
      options: { horizontal: isHorizontal, vertical: isVertical },
    } = parseArgs({
      args: commandArgs,
      positionals: [],
      options: [
        {
          type: ParseableType.Boolean,
          name: 'horizontal',
        },
        {
          type: ParseableType.Boolean,
          name: 'vertical',
        },
      ],
    } as const);

    if (inputIds.length < 2) {
      console.log('Must provide two or more image ids');
      withExit(1, this.printUsage.bind(this));
    }

    if ((isHorizontal && isVertical) || (!isHorizontal && !isVertical)) {
      console.log('Must provide exactly one of "horizontal" or "vertical"');
      withExit(1, this.printUsage.bind(this));
    }

    const parsedIds = inputIds.map((id) => Command.parseInputId(id));
    const metaList = parsedIds.map((id) => {
      return this.metadataManager.getMetaById(id);
    });

    const subimages = metaList.map((meta) => {
      console.log(`  decoding ${meta.filePath}`);
      const buffer = fs.readFileSync(meta.filePath);
      const image = decodeImage(buffer);
      return image;
    });

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
    const filePath = PicturesManager.createPicture(encodedFinalImage);

    console.log(`  encoded final image ./${filePath}`);
  }
}
