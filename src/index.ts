import fs from 'fs'
import { posix } from 'path'

const debug = process.env.DEBUG !== undefined ? (message: string) => {
  console.log(message)
} : () => {}

function assertNotNull<T>(value: T) : asserts value is Exclude<T, null> {
  if (value === null) {
    throw Error('Unexpected null value')
  }
}

class Timestamp {
  year
  month
  day
  hour
  minute
  second

  static fromDay(day: string, hour: string, minute: string, second: string, date = new Date()) {
    return new Timestamp(
      date.getFullYear().toString(),
      (date.getMonth() + 1).toString().padStart(2, '0'),
      day,
      hour,
      minute,
      second
    );
  }

  static fromToday(hour: string, minute: string, second: string, date = new Date()) {
    return Timestamp.fromDay(
      date.getDate().toString().padStart(2, '0'),
      hour,
      minute,
      second,
      date,
    )
  }

  static fromNow() {
    const date = new Date();

    return Timestamp.fromToday(
      date.getHours().toString().padStart(2, '0'),
      date.getMinutes().toString().padStart(2, '0'),
      date.getSeconds().toString().padStart(2, '0'),
      date,
    )
  }

  constructor(year: string, month: string, day: string, hour: string, minute: string, second: string) {
    this.year = year;
    this.month = month;
    this.day = day;
    this.hour = hour;
    this.minute = minute;
    this.second = second;
  }

  get formatted() {
    return `${this.year}-${this.month}-${this.day}_${this.hour}-${this.minute}-${this.second}`
  }

  get hash() {
    const [
      year,
      month,
      day,
      hour,
      minute,
      second
    ] = [
      this.year.slice(-2),
      this.month,
      this.day,
      this.hour,
      this.minute,
      this.second
    ]
    // ].
    // map((value) => {
    //   const decimal = Number.parseInt(value, 10);
    //   const alternateBase = decimal.toString(16)
    //   const formatted = alternateBase.padStart(2, '0')
    //   return formatted
    // })

    const result = `${year}-${month}-${day}:${hour}${minute[0]}-${minute[1]}${second}`
    return result;
  }
}

class Picture {
  fileName
  filePath
  timestamp
  id

  static INPUT_FILE_NAME_REGEX = /^Screenshot (\d{4})-(\d{2})-(\d{2}) (\d{2})(\d{2})(\d{2})\.png$/
  static TRANSFORMED_FILE_NAME_REGEX = /^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})\.png$/

  constructor (fileName: string, filePath: string) {
    const matchingRegex = [
      Picture.INPUT_FILE_NAME_REGEX,
      Picture.TRANSFORMED_FILE_NAME_REGEX,
    ].find((regex) => regex.test(fileName))

    if (matchingRegex === undefined) {
      throw Error('Unknown file name format: ' + fileName)
    }

    const match = fileName.match(matchingRegex);
    assertNotNull(match);
    const [_, year, month, day, hour, minute, second] = match;
    const timestamp = new Timestamp(year, month, day, hour, minute, second);

    this.fileName = fileName;
    this.filePath = filePath;
    this.timestamp = timestamp;
    this.id = timestamp.hash
  }

  get transformedFileName() {
    const result = this.timestamp.formatted + '.png'
    return result
  }

  get isTransformed() {
    return this.fileName === this.transformedFileName;
  }
}

class PicturesManager {
  pictureList: Picture[] = []

  static PICS_DIR = './pics'

  init () {
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
      return new Picture(fileName, filePath)
    })
  }

  transform(pictureList: Picture[]) {
    debug('transform');
    return pictureList.filter((picture) => !picture.isTransformed).forEach((picture) => {
      const transformedFilePath = './' + posix.join(PicturesManager.PICS_DIR, picture.transformedFileName);
      fs.renameSync(picture.filePath, transformedFilePath)
    })
  }
}

class MetadataManager {
  data: any

  static FILE_PATH = '.metadata';

  init(picsManager: PicturesManager) {
    const pictureList = picsManager.pictureList
    let data = this.read();

    const guaranteedMetaById = Object.fromEntries(
      pictureList.map((pic) => {
        const guaranteedMeta = {
          id: pic.id,
          filePath: pic.filePath,
          tagSet: data.metaById[pic.id]?.tagSet ?? new Set()
        }
        return [pic.id, guaranteedMeta];
      })
    );

    const guaranteedIdByFileName = Object.fromEntries(
      pictureList.map((pic) => {
        const guaranteedId = pic.fileName in data.idByFileName ? data.idByFileName[pic.fileName] : pic.id
        return [pic.fileName, guaranteedId];
      })
    );

    const guaranteedIdSetByTag: Record<string, Set<string>> = {};
    pictureList
      .flatMap((pic) => {
        const meta = guaranteedMetaById[pic.id];
        return [...meta.tagSet].map((tag) => {
          return {
            pic,
            tag
          }
        })
      })
      .forEach(({ pic, tag }) => {
        const guaranteedIdSet = new Set(guaranteedIdSetByTag[tag] ?? []);
        guaranteedIdSet.add(pic.id);
        guaranteedIdSetByTag[tag] = guaranteedIdSet
      })

    const guaranteedData = {
      metaById: guaranteedMetaById,
      idByFileName: guaranteedIdByFileName,
      idSetByTag: guaranteedIdSetByTag
    }

    this.write(guaranteedData);
    this.data = guaranteedData
  }

  read() {
    const text = fs.readFileSync(MetadataManager.FILE_PATH, 'utf8')

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = {}
    }

    const modifiedMetaById = Object.fromEntries(
      Object.entries(data.metaById ?? {}).map(([id, meta]: [string, any]) => {
        return [id, { ...meta, tagSet: new Set(meta.tagSet)}]
      })
    )

    const modifiedIdSetByTag = Object.fromEntries(
      Object.entries(data.idSetByTag ?? {}).map(([tag, idList]: [string, any]) => {
        return [tag, new Set(idList)]
      })
    )

    return {
      metaById: modifiedMetaById,
      idByFileName: data.idByFileName ?? {},
      idSetByTag: modifiedIdSetByTag
    }
  }

  write(data: any) {
    const modifiedMetaById = Object.fromEntries(
      Object.entries(data.metaById ?? {}).map(([id, meta]: [string, any]) => {
        return [id, { ...meta, tagSet: [...meta.tagSet]}]
      })
    )

    const modifiedIdSetByTag = Object.fromEntries(
      Object.entries(data.idSetByTag ?? {}).map(([tag, idSet]: [string, any]) => {
        return [tag, [...idSet]]
      })
    )

    const stringifiableData = {
      metaById: modifiedMetaById,
      idByFileName: data.idByFileName,
      idSetByTag: modifiedIdSetByTag
    }

    const text = JSON.stringify(stringifiableData, null, 2);
    fs.writeFileSync(MetadataManager.FILE_PATH, text)
  }

  static SUCCESS = 0;
  static ERROR_ID_NOT_FOUND = 1;

  addTags(id: string, tagList: string[]) {
    const meta = this.data.metaById[id];

    if (!meta) {
      return MetadataManager.ERROR_ID_NOT_FOUND
    }

    tagList.forEach((tag) => {
      meta.tagSet.add(tag)
    })

    this.write(this.data);
    return MetadataManager.SUCCESS;
  }

  removeTags(id: string, tagList: string[]) {
    const meta = this.data.metaById[id];

    if (!meta) {
      return MetadataManager.ERROR_ID_NOT_FOUND
    }

    tagList.forEach((tag) => {
      meta.tagSet.delete(tag)
    })

    this.write(this.data);
    return MetadataManager.SUCCESS;
  }
}

const picsManager = new PicturesManager();
picsManager.init();

const dataManager = new MetadataManager();
dataManager.init(picsManager);

const inputIdParserConfig = [
  {
    label: 'time',
    regex: /^(\d{2})(\d)-?(\d)(\d{2})$/,
    parse: (match: RegExpMatchArray) => {
      const hour =  match[1];
      const minute = match[2] + match[3];
      const second = match[4]

      const timestamp = Timestamp.fromToday(hour, minute, second);
      return timestamp;
    }
  },
  {
    label: 'day and time',
    regex: /^(\d{2}):(\d{2})(\d)-?(\d)(\d{2})$/,
    parse: (match: RegExpMatchArray) => {
      const day = match[1]
      const hour =  match[2];
      const minute = match[3] + match[4];
      const second = match[5]

      const timestamp = Timestamp.fromDay(day, hour, minute, second);
      return timestamp
    }
  }
]

const parseInputId = (inputId: string) => {
  const matchingConfig = inputIdParserConfig.find((config) => config.regex.test(inputId));

  if (matchingConfig === undefined) {
    console.log('Invalid id format')
    process.exit(1);
  }

  const match = inputId.match(matchingConfig.regex)
  assertNotNull(match);
  const timestamp = matchingConfig.parse(match);

  return timestamp.hash;
}

const DIVIDER = Array.from({ length: 40 }).fill('-').join('');

const logMeta = (meta: any, includeDivider = false) => {
  console.log('Id   |', meta.id)
  console.log('File |', meta.filePath)
  console.log('Tags |', [...meta.tagSet].join(', '))

  if (includeDivider) {
    console.log(DIVIDER)
  }
}

const logMetaList = (metaList: any[]) => {
  const sortedList = [...metaList].sort((metaA, metaB) => {
    if (metaA.filePath < metaB.filePath) {
      return 1
    }

    if (metaA.filePath === metaB.filePath) {
      return 0
    }

    return -1;
  })

  sortedList.forEach((meta, index) => {
    logMeta(meta, index < metaList.length - 1);
  })
}

const logMetaById = (id: string) => {
  const meta = dataManager.data.metaById[id]

  if (!meta) {
    console.log('Id "' + id + '" does not exist')
    process.exit();
  }

  logMeta(meta);
}

const validateStatus = (status: number, state: Record<string, unknown>) => {
  if (status === MetadataManager.SUCCESS) {
    return;
  } else if (status === MetadataManager.ERROR_ID_NOT_FOUND) {
    console.log('Id "' + state.id + '" does not exist');
  } else {
    console.log('Unhandled status: "' + status + '"')
  }

  process.exit(1);
}

(function start(){
  const [command, ...argList] = process.argv.slice(2);

  if (command === 'latest' || command === 'last') {
    const id = picsManager.pictureList[picsManager.pictureList.length - 1].id
    logMetaById(id);
    process.exit();
  }

  if (command === 'list') {
    const [stringCount] = argList;

    const count = stringCount !== undefined ? Number.parseInt(stringCount): Infinity;
    const metaSublist = Object.values(dataManager.data.metaById).slice(-count);

    logMetaList(metaSublist)
    process.exit();
  }

  if (command === 'get') {
    const [inputId] = argList;

    if (!inputId) {
      console.log('Missing input id')
      process.exit(1);
    }

    const id = parseInputId(inputId)
    logMetaById(id);
    process.exit();
  }

  if (command === 'tag') {
    const [inputId, ...tagList] = argList;

    if (!inputId || tagList.length === 0) {
      console.log('Missing id or tag list')
      process.exit(1);
    }

    const id = parseInputId(inputId)
    const status = dataManager.addTags(id, tagList);
    validateStatus(status, { id });

    logMetaById(id);

    process.exit();
  }

  if (command === 'untag') {
    const [inputId, ...tagList] = argList;

    if (!inputId || tagList.length === 0) {
      console.log('Missing id or tag list')
      process.exit(1);
    }

    const id = parseInputId(inputId)
    const status = dataManager.removeTags(id, tagList);
    validateStatus(status, { id });
    logMetaById(id);

    process.exit();
  }

  if (command === 'search') {
    const tagList = argList;

    const anyMatchingIdSet = new Set(
      tagList.flatMap((tag) => {
        const subset = dataManager.data.idSetByTag[tag] ?? new Set();
        return [...subset]
      })
    );

    const allMatchingIdList = [...anyMatchingIdSet].filter((id) => {
      const meta = dataManager.data.metaById[id];
      return tagList.every((tag) => meta.tagSet.has(tag))
    })

    const metaList = allMatchingIdList.map((id) => {
      return dataManager.data.metaById[id]
    })

    logMetaList(metaList);
    process.exit();
  }

  if (command === 'backup') {
    const BACKUP_DIR = 'backup'
    const timestamp = Timestamp.fromNow();
    const destinationDirectoryName = posix.join(BACKUP_DIR, timestamp.formatted)

    fs.mkdirSync(destinationDirectoryName)
    fs.cpSync(PicturesManager.PICS_DIR, posix.join(destinationDirectoryName, PicturesManager.PICS_DIR), {recursive: true})
    fs.cpSync(MetadataManager.FILE_PATH, posix.join(destinationDirectoryName, MetadataManager.FILE_PATH))

    console.log('Backed up to: ' + destinationDirectoryName);

    process.exit();
  }

  console.log('Invalid command')
  process.exit(1);
})()
