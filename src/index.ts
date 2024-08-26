import fs from 'fs';
import { posix } from 'path';
import { ParseableType, parseArgs } from './parseArgs';
import { assertIsNotUndefined } from './assertIsNotUndefined';

const debug =
  process.env.DEBUG !== undefined
    ? (message: string) => {
        console.log(message);
      }
    : () => {};

function assertIsNotNull<T>(value: T): asserts value is Exclude<T, null> {
  if (value === null) {
    throw Error('Unexpected null value');
  }
}

function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error('Unexpected non-string value');
  }
}

function assertIsObject(
  value: unknown,
): asserts value is Record<string, unknown> {
  const isObject =
    typeof value === 'object' && value !== null && !Array.isArray(value);

  if (!isObject) {
    throw Error('Unexpected non-object');
  }
}

function assertIsArray(value: unknown): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw Error('Unexpected non-array');
  }
}

function assertIsStringArray(value: unknown): asserts value is string[] {
  assertIsArray(value);
  value.every(assertIsString);
}

enum Command {
  list = 'list',
  latest = 'latest',
  get = 'get',
  search = 'search',
  last = 'last',
  tag = 'tag',
  untag = 'untag',
  backup = 'backup',
}

const COMMAND_OPTIONS = Object.values(Command);
type CommandOptions = typeof COMMAND_OPTIONS;

const isCommand = (value: string): value is Command => {
  return (COMMAND_OPTIONS as string[]).includes(value);
};

type CommandDefinition = {
  name: Command;
  isDeprecated?: true;
  description: string;
  examples: string[];
};

const LIST_DEFAULT = 100;

const commands: Record<Command, CommandDefinition> = {
  [Command.get]: {
    name: Command.get,
    description:
      "Prints either the latest picture's metadata or the metadata for the given id",
    examples: ['--latest', '<id>'],
  },
  [Command.list]: {
    name: Command.list,
    description: `Prints the latest n metadata. n defaults to ${LIST_DEFAULT} and must be greater than zero or less than or equal to the default.`,
    examples: ['', '<n>'],
  },
  [Command.last]: {
    name: Command.last,
    isDeprecated: true,
    description: '',
    examples: [],
  },
  [Command.latest]: {
    name: Command.latest,
    isDeprecated: true,
    description: '',
    examples: [],
  },
  [Command.search]: {
    name: Command.search,
    description: 'Prints all metadata that has every tag matched by the search',
    examples: ['tag1 [, tag2 [, ...tagN]]'],
  },
  [Command.tag]: {
    name: Command.tag,
    description:
      "Adds one or more tags to a picture's metadata. Duplicate tags are not added twice",
    examples: ['tag1 [, tag2 [, ...tagN]]'],
  },
  [Command.untag]: {
    name: Command.untag,
    description:
      "Removes one or more tags from a picture's metadata. Non-existant tags are ignored.",
    examples: ['tag1 [, tag2 [, ...tagN]]'],
  },
  [Command.backup]: {
    name: Command.backup,
    description: 'Copies pictures and metadata to the "backup" folder',
    examples: [''],
  },
};

const printUsage = (command: Command, replacement?: Command) => {
  if (replacement) {
    console.log(
      `Command "${command}" is deprecated. Use "${replacement}" instead.\n`,
    );
  }

  const commandToPrint = replacement ?? command;
  const usageToPrint = commands[commandToPrint];

  if (replacement || !commands[command].isDeprecated) {
    console.log(commandToPrint + ': ' + usageToPrint.description);

    const examples = usageToPrint.examples.map(
      (example) => `  notes ${commandToPrint} ` + example,
    );
    examples.forEach((example) => {
      console.log(example);
    });
  }
};

const printHelp = () => {
  console.log('notes <command> [...args]');
  console.log();

  COMMAND_OPTIONS.toSorted().forEach((command) => {
    const usage = commands[command];
    if (!usage.isDeprecated) {
      printUsage(command);
      console.log();
    }
  });
};

function withExit<TCallable extends (...args: any[]) => void>(
  exitCode: number,
  callable: TCallable,
  ...args: Parameters<typeof callable>
): never {
  callable(...args);
  process.exit(exitCode);
}

class Timestamp {
  year;
  month;
  day;
  hour;
  minute;
  second;

  static fromMonth(
    month: string,
    day: string,
    hour: string,
    minute: string,
    second: string,
    date = new Date(),
  ) {
    return new Timestamp(
      date.getFullYear().toString(),
      month,
      day,
      hour,
      minute,
      second,
    );
  }

  static fromDay(
    day: string,
    hour: string,
    minute: string,
    second: string,
    date = new Date(),
  ) {
    return new Timestamp(
      date.getFullYear().toString(),
      (date.getMonth() + 1).toString().padStart(2, '0'),
      day,
      hour,
      minute,
      second,
    );
  }

  static fromToday(
    hour: string,
    minute: string,
    second: string,
    date = new Date(),
  ) {
    return Timestamp.fromDay(
      date.getDate().toString().padStart(2, '0'),
      hour,
      minute,
      second,
      date,
    );
  }

  static fromNow() {
    const date = new Date();

    return Timestamp.fromToday(
      date.getHours().toString().padStart(2, '0'),
      date.getMinutes().toString().padStart(2, '0'),
      date.getSeconds().toString().padStart(2, '0'),
      date,
    );
  }

  constructor(
    year: string,
    month: string,
    day: string,
    hour: string,
    minute: string,
    second: string,
  ) {
    this.year = year;
    this.month = month;
    this.day = day;
    this.hour = hour;
    this.minute = minute;
    this.second = second;
  }

  get formatted() {
    return `${this.year}-${this.month}-${this.day}_${this.hour}-${this.minute}-${this.second}`;
  }

  get hash() {
    const [year, month, day, hour, minute, second] = [
      this.year.slice(-2),
      this.month,
      this.day,
      this.hour,
      this.minute,
      this.second,
    ];

    const result = `${year}-${month}-${day}:${hour}${minute[0]}-${minute[1]}${second}`;
    return result;
  }
}

class Picture {
  fileName;
  filePath;
  timestamp;
  id;

  static INPUT_FILE_NAME_REGEX =
    /^Screenshot (\d{4})-(\d{2})-(\d{2}) (\d{2})(\d{2})(\d{2})\.png$/;
  static TRANSFORMED_FILE_NAME_REGEX =
    /^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})\.png$/;

  constructor(fileName: string, filePath: string) {
    const matchingRegex = [
      Picture.INPUT_FILE_NAME_REGEX,
      Picture.TRANSFORMED_FILE_NAME_REGEX,
    ].find((regex) => regex.test(fileName));

    if (matchingRegex === undefined) {
      throw Error('Unknown file name format: ' + fileName);
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

    this.fileName = fileName;
    this.filePath = filePath;
    this.timestamp = timestamp;
    this.id = timestamp.hash;
  }

  get transformedFileName() {
    const result = this.timestamp.formatted + '.png';
    return result;
  }

  get isTransformed() {
    return this.fileName === this.transformedFileName;
  }
}

class PicturesManager {
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

type MetaJson = {
  id: string;
  filePath: string;
  tagSet: string[];
};

type Meta = {
  id: string;
  filePath: string;
  tagSet: Set<string>;
};

function assertIsMetaJson(value: unknown): asserts value is MetaJson {
  assertIsObject(value);
  assertIsString(value.id);
  assertIsString(value.filePath);
  assertIsStringArray(value.tagSet);
}

type Metadata = {
  metaById: Record<string, Meta>;
  idByFileName: Record<string, string>;
  idSetByTag: Record<string, Set<string>>;
};

class MetadataManager {
  data: Metadata = {
    metaById: {},
    idByFileName: {},
    idSetByTag: {},
  };

  static FILE_PATH = '.metadata';

  init(picsManager: PicturesManager) {
    const pictureList = picsManager.pictureList;
    let data = this.read();

    const guaranteedMetaById = Object.fromEntries(
      pictureList.map((pic) => {
        const guaranteedMeta = {
          id: pic.id,
          filePath: pic.filePath,
          tagSet: data.metaById[pic.id]?.tagSet ?? new Set(),
        };
        return [pic.id, guaranteedMeta];
      }),
    );

    const guaranteedIdByFileName = Object.fromEntries(
      pictureList.map((pic) => {
        const guaranteedId =
          pic.fileName in data.idByFileName
            ? data.idByFileName[pic.fileName]
            : pic.id;
        assertIsString(guaranteedId);
        return [pic.fileName, guaranteedId];
      }),
    );

    const guaranteedIdSetByTag: Record<string, Set<string>> = {};
    pictureList
      .flatMap((pic) => {
        const meta = guaranteedMetaById[pic.id];
        assertIsNotUndefined(meta);
        return [...meta.tagSet].map((tag) => {
          return {
            pic,
            tag,
          };
        });
      })
      .forEach(({ pic, tag }) => {
        const guaranteedIdSet = new Set(guaranteedIdSetByTag[tag] ?? []);
        guaranteedIdSet.add(pic.id);
        guaranteedIdSetByTag[tag] = guaranteedIdSet;
      });

    const guaranteedData: Metadata = {
      metaById: guaranteedMetaById,
      idByFileName: guaranteedIdByFileName,
      idSetByTag: guaranteedIdSetByTag,
    };

    this.write(guaranteedData);
    this.data = guaranteedData;
  }

  read() {
    const text = fs.readFileSync(MetadataManager.FILE_PATH, 'utf8');

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = {
        metaById: {},
        idByFileName: {},
        idSetByTag: {},
      } satisfies Metadata;
    }

    assertIsObject(data);
    assertIsObject(data.metaById);
    assertIsObject(data.idByFileName);
    assertIsObject(data.idSetByTag);

    const modifiedMetaById = Object.fromEntries(
      Object.entries(data.metaById ?? {}).map(([id, meta]) => {
        assertIsMetaJson(meta);
        return [id, { ...meta, tagSet: new Set(meta.tagSet) }];
      }),
    );

    const modifiedIdSetByTag = Object.fromEntries(
      Object.entries(data.idSetByTag ?? {}).map(([tag, idList]) => {
        assertIsArray(idList);
        idList.every(assertIsString);
        return [tag, new Set(idList)];
      }),
    );

    return {
      metaById: modifiedMetaById,
      idByFileName: data.idByFileName ?? {},
      idSetByTag: modifiedIdSetByTag,
    };
  }

  write(data: Metadata) {
    const modifiedMetaById = Object.fromEntries(
      Object.entries(data.metaById ?? {}).map(([id, meta]) => {
        return [id, { ...meta, tagSet: [...meta.tagSet] }];
      }),
    );

    const modifiedIdSetByTag = Object.fromEntries(
      Object.entries(data.idSetByTag ?? {}).map(([tag, idSet]) => {
        return [tag, [...idSet]];
      }),
    );

    const stringifiableData = {
      metaById: modifiedMetaById,
      idByFileName: data.idByFileName,
      idSetByTag: modifiedIdSetByTag,
    };

    const text = JSON.stringify(stringifiableData, null, 2);
    fs.writeFileSync(MetadataManager.FILE_PATH, text);
  }

  static SUCCESS = 0;
  static ERROR_ID_NOT_FOUND = 1;

  addTags(id: string, tagList: string[]) {
    const meta = this.data.metaById[id];

    if (!meta) {
      return MetadataManager.ERROR_ID_NOT_FOUND;
    }

    tagList.forEach((tag) => {
      meta.tagSet.add(tag);
    });

    this.write(this.data);
    return MetadataManager.SUCCESS;
  }

  removeTags(id: string, tagList: string[]) {
    const meta = this.data.metaById[id];

    if (!meta) {
      return MetadataManager.ERROR_ID_NOT_FOUND;
    }

    tagList.forEach((tag) => {
      meta.tagSet.delete(tag);
    });

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
      assertIsNotUndefined(match[1]);
      assertIsNotUndefined(match[2]);
      assertIsNotUndefined(match[3]);
      assertIsNotUndefined(match[4]);

      const hour = match[1];
      const minute = match[2] + match[3];
      const second = match[4];

      const timestamp = Timestamp.fromToday(hour, minute, second);
      return timestamp;
    },
  },
  {
    label: 'day and time',
    regex: /^(\d{2}):?(\d{2})(\d)-?(\d)(\d{2})$/,
    parse: (match: RegExpMatchArray) => {
      assertIsNotUndefined(match[1]);
      assertIsNotUndefined(match[2]);
      assertIsNotUndefined(match[3]);
      assertIsNotUndefined(match[4]);
      assertIsNotUndefined(match[5]);

      const day = match[1];
      const hour = match[2];
      const minute = match[3] + match[4];
      const second = match[5];

      const timestamp = Timestamp.fromDay(day, hour, minute, second);
      return timestamp;
    },
  },
  {
    label: 'month, day and time',
    regex: /^(\d{2})-?(\d{2}):?(\d{2})(\d)-?(\d)(\d{2})$/,
    parse: (match: RegExpMatchArray) => {
      assertIsNotUndefined(match[1]);
      assertIsNotUndefined(match[2]);
      assertIsNotUndefined(match[3]);
      assertIsNotUndefined(match[4]);
      assertIsNotUndefined(match[6]);

      const month = match[1];
      const day = match[2];
      const hour = match[3];
      const minute = match[4] + match[5];
      const second = match[6];

      const timestamp = Timestamp.fromMonth(month, day, hour, minute, second);
      return timestamp;
    },
  },
];

const parseInputId = (inputId: string) => {
  const matchingConfig = inputIdParserConfig.find((config) =>
    config.regex.test(inputId),
  );

  if (matchingConfig === undefined) {
    withExit(1, console.log, 'Invalid id format');
  }

  const match = inputId.match(matchingConfig.regex);
  assertIsNotNull(match);
  const timestamp = matchingConfig.parse(match);

  return timestamp.hash;
};

const DIVIDER = Array.from({ length: 40 }).fill('-').join('');

const logMeta = (meta: Meta, includeDivider = false) => {
  console.log('Id   |', meta.id);
  console.log('File |', meta.filePath);
  console.log('Tags |', [...meta.tagSet].join(', '));

  if (includeDivider) {
    console.log(DIVIDER);
  }
};

const logMetaList = (metaList: Meta[]) => {
  if (metaList.length === 0) {
    console.log('NO DATA');
  }

  const sortedList = [...metaList].sort((metaA, metaB) => {
    if (metaA.filePath < metaB.filePath) {
      return 1;
    }

    if (metaA.filePath === metaB.filePath) {
      return 0;
    }

    return -1;
  });

  sortedList.forEach((meta, index) => {
    logMeta(meta, index < metaList.length - 1);
  });
};

const logMetaById = (id: string) => {
  const meta = dataManager.data.metaById[id];

  if (!meta) {
    withExit(0, console.log, 'Id "' + id + '" does not exist');
  }

  logMeta(meta);
};

const validateStatus = (status: number, state: Record<string, unknown>) => {
  if (status === MetadataManager.SUCCESS) {
    return;
  } else if (status === MetadataManager.ERROR_ID_NOT_FOUND) {
    console.log('Id "' + state.id + '" does not exist');
  } else {
    console.log('Unhandled status: "' + status + '"');
  }

  withExit(1, () => {});
};

const parseAndValidateCommandAndHelp = (args: string[]): Command => {
  const {
    positionals: [command],
    options: { help },
  } = parseArgs({
    args: args,
    positionals: [
      {
        type: ParseableType.String,
      },
    ] as const,
    options: [
      {
        type: ParseableType.Boolean,
        name: 'help',
      },
    ] as const,
  });

  const hasCommand = command !== undefined;
  const hasInvalidCommand = hasCommand && !isCommand(command);

  if (hasInvalidCommand) {
    console.log(`Invalid command "${command}"`);
    withExit(1, printHelp);
  } else if (help && hasCommand && !hasInvalidCommand) {
    withExit(0, printUsage, command);
  } else if (help || !hasCommand) {
    withExit(0, printHelp);
  } else {
    return command;
  }
};

(function start() {
  const args = process.argv.slice(2);
  const commandArgs = args.slice(1);

  const command = parseAndValidateCommandAndHelp(args);

  if (command === Command.latest || command === Command.last) {
    withExit(1, printUsage, command, Command.get);
  }

  if (command === Command.list) {
    const {
      positionals: [count = LIST_DEFAULT],
    } = parseArgs({
      args: commandArgs,
      positionals: [
        {
          type: ParseableType.Number,
        },
      ] as const,
      options: [],
    });

    if (count < 1 || count > LIST_DEFAULT) {
      withExit(1, printUsage, command);
    }

    const metaSublist = Object.values(dataManager.data.metaById).slice(-count);
    withExit(0, logMetaList, metaSublist);
  }

  if (command === Command.get) {
    const {
      positionals: [inputId],
      options: { latest },
    } = parseArgs({
      args: commandArgs,
      positionals: [
        {
          type: ParseableType.String,
        },
      ],
      options: [
        {
          name: 'latest',
          type: ParseableType.Boolean,
        },
      ],
    });

    if (latest && inputId !== undefined) {
      withExit(1, printUsage, command);
    }

    let id: string;
    if (latest && inputId === undefined) {
      const potentialId =
        picsManager.pictureList[picsManager.pictureList.length - 1]?.id;

      if (!potentialId) {
        withExit(0, logMetaList, []);
      }

      id = potentialId;
    } else {
      assertIsString(inputId);
      id = parseInputId(inputId);
    }

    withExit(0, logMetaById, id);
  }

  if (command === Command.tag) {
    const [inputId, ...tagList] = args;

    if (!inputId || tagList.length === 0) {
      console.log();
      withExit(1, console.log, 'Missing id or tag list');
    }

    const id = parseInputId(inputId);
    const status = dataManager.addTags(id, tagList);
    validateStatus(status, { id });

    withExit(0, logMetaById, id);
  }

  if (command === Command.untag) {
    const [inputId, ...tagList] = commandArgs;

    if (!inputId || tagList.length === 0) {
      withExit(1, console.log, 'Missing id or tag list');
    }

    const id = parseInputId(inputId);
    const status = dataManager.removeTags(id, tagList);
    validateStatus(status, { id });

    withExit(0, logMetaById, id);
  }

  if (command === Command.search) {
    const tagList = commandArgs;

    const anyMatchingIdSet = new Set(
      tagList.flatMap((tag) => {
        const subset = dataManager.data.idSetByTag[tag] ?? new Set();
        return [...subset];
      }),
    );

    const allMatchingIdList = [...anyMatchingIdSet].filter((id) => {
      const meta = dataManager.data.metaById[id];
      assertIsNotUndefined(meta);
      return tagList.every((tag) => meta.tagSet.has(tag));
    });

    const metaList = allMatchingIdList.map((id) => {
      const meta = dataManager.data.metaById[id];
      assertIsNotUndefined(meta);
      return meta;
    });

    withExit(0, logMetaList, metaList);
  }

  if (command === Command.backup) {
    const BACKUP_DIR = 'backup';
    const timestamp = Timestamp.fromNow();
    const destinationDirectoryName = posix.join(
      BACKUP_DIR,
      timestamp.formatted,
    );

    fs.mkdirSync(destinationDirectoryName);
    fs.cpSync(
      PicturesManager.PICS_DIR,
      posix.join(destinationDirectoryName, PicturesManager.PICS_DIR),
      { recursive: true },
    );
    fs.cpSync(
      MetadataManager.FILE_PATH,
      posix.join(destinationDirectoryName, MetadataManager.FILE_PATH),
    );

    withExit(0, console.log, 'Backed up to: ' + destinationDirectoryName);
  }
})();
