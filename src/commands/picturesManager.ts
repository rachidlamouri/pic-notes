import { debug } from '../utils/debug';
import { Picture } from './picture';
import fs from 'fs';
import { posix } from 'path';
import { withExit } from './withExit';
import { printNoData } from './print';
import { assertIsNotUndefined } from '../utils/assertIsNotUndefined';

export class PicturesManager {
  pictureList: Picture[] = [];

  static PICS_DIR = './pics';

  static TMP_DIR = './tmp';

  static TMP_APPEND = posix.join(PicturesManager.TMP_DIR, 'append');

  static TMP_RECYCLE = posix.join(PicturesManager.TMP_DIR, 'recycle');

  init() {
    debug('init');

    let pictureList = this.read();
    if (pictureList.some((file) => !file.isTransformed)) {
      this.transform(pictureList);
      pictureList = this.read();
    }

    this.pictureList = pictureList;
  }

  static overwritePicture(filePath: string, data: Buffer) {
    if (!fs.existsSync(filePath)) {
      throw new Error(
        `File path ${filePath} does not exist and can't be overwritten`,
      );
    }

    fs.writeFileSync(filePath, data);
  }

  static createPicture(data: Buffer) {
    const filePath = posix.join(
      this.PICS_DIR,
      Picture.getTimestampedFileName(),
    );

    if (fs.existsSync(filePath)) {
      throw new Error(`File path ${filePath} already exists`);
    }

    fs.writeFileSync(filePath, data);

    return filePath;
  }

  static createTemporaryBackup(filePath: string): string {
    const fileName = posix.basename(filePath);
    const outputFilePath = posix.join(this.TMP_APPEND, fileName);

    if (fs.existsSync(outputFilePath)) {
      throw new Error(`Backup destination already exists: ${outputFilePath}`);
    }

    fs.copyFileSync(filePath, outputFilePath);
    return outputFilePath;
  }

  static recyclePictures(filePathList: string[]): string[] {
    const backupFilePaths = filePathList.map((filePath) => {
      const fileName = posix.basename(filePath);
      const outputFilePath = posix.join(this.TMP_RECYCLE, fileName);

      fs.renameSync(filePath, outputFilePath);
      return outputFilePath;
    });

    return backupFilePaths;
  }

  read() {
    debug('read');
    const pictures = fs
      .readdirSync(PicturesManager.PICS_DIR)
      .map((fileName: string) => {
        const filePath = './' + posix.join(PicturesManager.PICS_DIR, fileName);
        return new Picture(fileName, filePath);
      });

    const picturesById: Record<string, Picture[]> = {};
    pictures.forEach((picture) => {
      const list = picturesById[picture.id] ?? [];
      list.push(picture);
      picturesById[picture.id] = list;
    });

    const invalidEntries = Object.entries(picturesById).filter(([, list]) => {
      return list.length > 1;
    });

    if (invalidEntries.length > 0) {
      const formattedMessage = invalidEntries
        .flatMap(([id, duplicates]) => {
          const firstDuplicate = duplicates[0];
          assertIsNotUndefined(firstDuplicate);

          return [
            `  ${firstDuplicate.transformedFileName}`,
            ...duplicates.map((picture) => {
              return `    ${picture.filePath}`;
            }),
          ];
        })
        .join('\n');

      throw new Error(
        `Found duplicates for the following pictures\n${formattedMessage}`,
      );
    }

    return pictures;
  }

  transform(pictureList: Picture[]) {
    debug('transform');
    return pictureList
      .filter((picture) => !picture.isTransformed)
      .forEach((picture) => {
        const transformedFilePath =
          './' +
          posix.join(PicturesManager.PICS_DIR, picture.transformedFileName);
        fs.renameSync(picture.filePath, transformedFilePath);
      });
  }

  get lastPicture(): Picture {
    const picture = this.pictureList.at(-1);

    if (!picture) {
      withExit(0, printNoData);
    }

    return picture;
  }
}
