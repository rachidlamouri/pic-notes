import { Command } from '../command';
import { CommandName } from '../commandName';
import { printMeta } from '../print';
import { withExit } from '../withExit';

export class Untag extends Command<CommandName.Untag> {
  name = CommandName.Untag as const;
  description =
    "Removes one or more tags from a picture's metadata. Non-existant tags are ignored.";
  examples = ['tag1 [, tag2 [, ...tagN]]'];

  run(commandArgs: string[]): void {
    const [inputId, ...tagList] = commandArgs;

    if (!inputId || tagList.length === 0) {
      console.log('Missing id or tag list');
      withExit(1, this.printUsage.bind(this));
    }

    const id = Command.parseInputId(inputId);
    this.metadataManager.removeTags(id, tagList);
    const meta = this.metadataManager.getMetaById(id);

    withExit(0, printMeta, meta);
  }
}
