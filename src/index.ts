import fs from 'fs';
import { posix } from 'path';
import { parseArgs } from './parse-args/parseArgs';
import { assertIsNotUndefined } from './utils/assertIsNotUndefined';
import { ParseableType } from './parse-args/parseableType';
import { CommandName, isCommandName } from './commands/commandName';
import { LIST_DEFAULT } from './commands/allCommands';
import { assertIsNotNull } from './utils/assertIsNotNull';
import { assertIsString } from './utils/assertIsString';
import {
  buildPrintMetaById,
  printHelp,
  printMetaList,
  printUsage,
} from './commands/print';
import { withExit } from './commands/withExit';
import { Timestamp } from './commands/timestamp';
import { PicturesManager } from './commands/picturesManager';
import { MetadataManager } from './commands/metadataManager';

const picsManager = new PicturesManager();
picsManager.init();

const dataManager = new MetadataManager();
dataManager.init(picsManager);

const printMetaById = buildPrintMetaById(dataManager);

// TODO: turn this into a single parser config with a single regex
// TODO: add custom validation to parseArgs
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

const parseAndValidateCommandAndHelp = (args: string[]): CommandName => {
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
  const hasInvalidCommand = hasCommand && !isCommandName(command);

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

  if (command === CommandName.latest || command === CommandName.last) {
    withExit(1, printUsage, command, CommandName.get);
  }

  if (command === CommandName.list) {
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
    withExit(0, printMetaList, metaSublist);
  }

  if (command === CommandName.get) {
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
        withExit(0, printMetaList, []);
      }

      id = potentialId;
    } else {
      assertIsString(inputId);
      id = parseInputId(inputId);
    }

    withExit(0, printMetaById, id);
  }

  if (command === CommandName.tag) {
    const [inputId, ...tagList] = args;

    if (!inputId || tagList.length === 0) {
      console.log();
      withExit(1, console.log, 'Missing id or tag list');
    }

    const id = parseInputId(inputId);
    const status = dataManager.addTags(id, tagList);
    validateStatus(status, { id });

    withExit(0, printMetaById, id);
  }

  if (command === CommandName.untag) {
    const [inputId, ...tagList] = commandArgs;

    if (!inputId || tagList.length === 0) {
      withExit(1, console.log, 'Missing id or tag list');
    }

    const id = parseInputId(inputId);
    const status = dataManager.removeTags(id, tagList);
    validateStatus(status, { id });

    withExit(0, printMetaById, id);
  }

  if (command === CommandName.search) {
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

    withExit(0, printMetaList, metaList);
  }

  if (command === CommandName.backup) {
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
