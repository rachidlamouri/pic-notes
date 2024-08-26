import { ParseableType } from '../../parse-args/parseableType';
import { parseArgs } from '../../parse-args/parseArgs';
import { assertIsString } from '../../utils/assertIsString';
import { Command } from '../command';
import { CommandName } from '../commandName';
import { printMeta, printNoData } from '../print';
import { withExit } from '../withExit';

export class Get extends Command<CommandName.Get> {
  name = CommandName.Get as const;
  description =
    "Prints either the latest picture's metadata or the metadata for the given id";
  examples = ['--latest', '<id>'];

  run(commandArgs: string[]): void {
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

    if ((latest && inputId !== undefined) || (!latest && !inputId)) {
      console.log('Invalid input');
      withExit(1, this.printUsage.bind(this));
    }

    let id: string;
    if (latest && inputId === undefined) {
      const potentialId = this.picturesManager.lastPicture?.id;

      if (!potentialId) {
        withExit(0, printNoData);
      }

      id = potentialId;
    } else {
      assertIsString(inputId);
      id = Command.parseInputId(inputId);
    }

    const meta = this.metadataManager.getMetaById(id);
    withExit(0, printMeta, meta);
  }
}
