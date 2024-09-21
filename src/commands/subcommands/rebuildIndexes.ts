import { Command } from '../command';
import { CommandName } from '../commandName';
import { withExit } from '../withExit';

export class RebuildIndexes extends Command<CommandName.RebuildIndexes> {
  name = CommandName.RebuildIndexes as const;
  description = 'Rebuilds metadata indexes based off of tags';
  examples = [];

  run(): void {
    this.metadataManager.rebuildIndexes();
    withExit(0, console.log, 'Done');
  }
}
