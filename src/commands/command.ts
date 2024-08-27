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
    const ID_REGEX =
      /^((((?<year>\d{4}|\d{2})-?)?((?<month>\d{2})-?))?(?<day>\d{2}):?)?(?<hour>\d{2})-?(?<minuteTens>\d)-?(?<minuteOnes>\d)-?(?<second>\d{2})$/;

    const match = inputId.match(ID_REGEX);

    if (match?.groups === undefined) {
      withExit(1, console.log, 'Invalid id format');
    }

    const { year, month, day, hour, minuteTens, minuteOnes, second } =
      match.groups;

    const minute =
      minuteTens !== undefined && minuteOnes !== undefined
        ? minuteTens + minuteOnes
        : undefined;

    assertIsNotUndefined(hour);
    assertIsNotUndefined(minute);
    assertIsNotUndefined(second);

    const timestamp = new Timestamp(year, month, day, hour, minute, second);
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
