import { Command } from '../command';
import { CommandName } from '../commandName';
import { withExit } from '../withExit';

export class Last extends Command<CommandName.Last> {
  name = CommandName.Last as const;
  description = '';
  examples = [];

  run(_commandArgs: string[]): void {
    withExit(1, this.printUsage.bind(this));
  }
}
