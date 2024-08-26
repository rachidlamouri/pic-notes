import { Command } from '../command';
import { CommandName } from '../commandName';
import { printMeta } from '../print';
import { withExit } from '../withExit';

export class Tag extends Command<CommandName.Tag> {
  name = CommandName.Tag as const;
  description =
    "Adds one or more tags to a picture's metadata. Duplicate tags are not added twice";
  examples = ['tag1 [, tag2 [, ...tagN]]'];

  run(commandArgs: string[]): void {
    const [inputId, ...tagList] = commandArgs;

    if (!inputId || tagList.length === 0) {
      console.log();
      withExit(1, console.log, 'Missing id or tag list');
    }

    const id = Command.parseInputId(inputId);
    this.metadataManager.addTags(id, tagList);

    const meta = this.metadataManager.getMetaById(id);
    withExit(0, printMeta, meta);
  }
}
