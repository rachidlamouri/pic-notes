import { Timestamp } from './timestamp';
import { assertIsNotNull } from '../utils/assertIsNotNull';
import { assertIsNotUndefined } from '../utils/assertIsNotUndefined';
import fs from 'fs';

export class Picture {
  fileName;
  filePath;
  timestamp;
  id;

  hadValidFileName: boolean;

  static getTimestampedFileName() {
    return `${Timestamp.fromNow().formatted}.png`;
  }

  static INPUT_FILE_NAME_REGEX =
    /^Screenshot (\d{4})-(\d{2})-(\d{2}) (\d{2})(\d{2})(\d{2})\.png$/;
  static TRANSFORMED_FILE_NAME_REGEX =
    /^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})\.png$/;

  constructor(fileName: string, filePath: string) {
    const fileNameTimestamp = Picture.parseFileName(fileName);
    const timestamp = fileNameTimestamp ?? Picture.parseLastModified(filePath);

    this.fileName = fileName;
    this.filePath = filePath;
    this.timestamp = timestamp;
    this.id = timestamp.hash;
    this.hadValidFileName = fileNameTimestamp !== null;
  }

  static parseFileName(fileName: string) {
    const matchingRegex = [
      Picture.INPUT_FILE_NAME_REGEX,
      Picture.TRANSFORMED_FILE_NAME_REGEX,
    ].find((regex) => regex.test(fileName));

    if (matchingRegex === undefined) {
      return null;
    }

    const match = fileName.match(matchingRegex);
    assertIsNotNull(match);
    const [_, year, month, day, hour, minute, second] = match;
    assertIsNotUndefined(year);
    assertIsNotUndefined(month);
    assertIsNotUndefined(day);
    assertIsNotUndefined(hour);
    assertIsNotUndefined(minute);
    assertIsNotUndefined(second);
    const timestamp = new Timestamp(year, month, day, hour, minute, second);
    return timestamp;
  }

  static parseLastModified(filePath: string) {
    const stats = fs.statSync(filePath);
    const timestamp = Timestamp.fromDate(stats.mtime);
    return timestamp;
  }

  get transformedFileName() {
    const result = this.timestamp.formatted + '.png';
    return result;
  }

  get isTransformed() {
    return this.fileName === this.transformedFileName;
  }
}
