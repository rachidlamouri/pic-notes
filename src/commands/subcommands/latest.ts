import { Command } from '../command';
import { CommandName } from '../commandName';
import { withExit } from '../withExit';

export class Latest extends Command<CommandName.Latest> {
  name = CommandName.Latest as const;
  description = '';
  examples = [];

  run(_commandArgs: string[]): void {
    withExit(1, this.printUsage.bind(this));
  }
}
