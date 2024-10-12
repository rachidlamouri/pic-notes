import { ParseableType } from '../../parse-args/parseableType';
import { parseArgs } from '../../parse-args/parseArgs';
import { Command } from '../command';
import { CommandName } from '../commandName';
import { printMetaList } from '../print';
import { withExit } from '../withExit';

export class List extends Command<CommandName.List> {
  static DEFAULT_COUNT = 100;

  name = CommandName.List as const;
  description = `Prints the latest n metadata. n defaults to ${List.DEFAULT_COUNT} and must be greater than zero or less than or equal to the default.`;
  examples = ['', '<n>'];

  run(commandArgs: string[]): void {
    const {
      positionals: [count = List.DEFAULT_COUNT],
    } = parseArgs({
      args: commandArgs,
      positionals: [
        {
          type: ParseableType.Number,
        },
      ] as const,
      options: [],
    });

    if (count < 1 || count > List.DEFAULT_COUNT) {
      withExit(1, this.printUsage.bind(this));
    }

    const metaSublist = Object.values(
      this.metadataManager.metadata.metaById,
    ).slice(-count);
    withExit(0, printMetaList, metaSublist);
  }
}
