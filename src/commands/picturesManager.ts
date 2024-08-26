import { debug } from '../utils/debug';
import { Picture } from './picture';
import fs from 'fs';
import { posix } from 'path';

export class PicturesManager {
  pictureList: Picture[] = [];

  static PICS_DIR = './pics';

  init() {
    debug('init');

    let pictureList = this.read();
    if (pictureList.some((file) => !file.isTransformed)) {
      this.transform(pictureList);
      pictureList = this.read();
    }

    this.pictureList = pictureList;
  }

  read() {
    debug('read');
    return fs.readdirSync(PicturesManager.PICS_DIR).map((fileName: string) => {
      const filePath = './' + posix.join(PicturesManager.PICS_DIR, fileName);
      return new Picture(fileName, filePath);
    });
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
}
