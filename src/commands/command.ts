import { ParseableType } from '../parse-args/parseableType';
import { parseArgs } from '../parse-args/parseArgs';
import { assertIsNotNull } from '../utils/assertIsNotNull';
import { assertIsNotUndefined } from '../utils/assertIsNotUndefined';
import { CommandsByName } from './buildCommandsByName';
import { CommandName, isCommandName } from './commandName';
import { MetadataManager } from './metadataManager';
import { PicturesManager } from './picturesManager';
import { Timestamp } from './timestamp';
import { withExit } from './withExit';

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

export type CommandInput = {
  metadataManager: MetadataManager;
  picturesManager: PicturesManager;
  replacement?: Command<CommandName>;
};

export abstract class Command<TCommandName extends CommandName>
  implements CommandInput
{
  metadataManager: MetadataManager;
  picturesManager: PicturesManager;

  abstract name: TCommandName;
  abstract description: string;
  abstract examples: string[];

  replacement: Command<CommandName> | undefined;

  get isDeprecated() {
    return this.replacement !== undefined;
  }

  constructor({ picturesManager, metadataManager, replacement }: CommandInput) {
    this.picturesManager = picturesManager;
    this.metadataManager = metadataManager;
    this.replacement = replacement;
  }

  abstract run(commandArgs: string[]): void;

  printUsage() {
    if (this.replacement) {
      console.log(
        `Command "${this.name}" is deprecated. Use "${this.replacement.name}" instead.\n`,
      );
    }

    const commandToPrint = this.replacement ?? this;

    if (!this.isDeprecated || this.replacement) {
      console.log(commandToPrint.name + ': ' + commandToPrint.description);

      const examples = commandToPrint.examples.map(
        (example) => `  notes ${commandToPrint.name} ` + example,
      );
      examples.forEach((example) => {
        console.log(example);
      });
    }
  }

  static parseInputId(inputId: string) {
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
  }

  static parseAndValidateCommandAndHelp = (
    commandsByName: CommandsByName,
    args: string[],
  ): Command<CommandName> => {
    const {
      positionals: [commandName],
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

    const hasCommand = commandName !== undefined;
    const hasInvalidCommand = hasCommand && !isCommandName(commandName);

    if (hasInvalidCommand) {
      console.log(`Invalid command "${commandName}"`);
      withExit(1, Command.printHelp, commandsByName);
    } else if (help && hasCommand && !hasInvalidCommand) {
      const command = commandsByName[commandName];
      withExit(0, command.printUsage.bind(command));
    } else if (help || !hasCommand) {
      withExit(0, Command.printHelp, commandsByName);
    } else {
      const command = commandsByName[commandName];
      return command;
    }
  };

  static printHelp(commandsByName: CommandsByName) {
    console.log('notes <command> [...args]');
    console.log();

    Object.values(commandsByName)
      .toSorted((commandA, commandB) => {
        return commandA.name.localeCompare(commandB.name);
      })
      .forEach((command) => {
        if (!command.isDeprecated) {
          command.printUsage();
          console.log();
        }
      });
  }
}
