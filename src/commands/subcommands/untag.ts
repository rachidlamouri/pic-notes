import { Command } from '../command';
import { CommandName } from '../commandName';
import { withExit } from '../withExit';

export class Untag extends Command<CommandName.Untag> {
  name = CommandName.Untag as const;
  description = '';
  examples = [];

  run(_commandArgs: string[]): void {
    withExit(1, this.printUsage.bind(this));
  }
}
