import { ParseableType } from '../../parse-args/parseableType';
import { parseArgs } from '../../parse-args/parseArgs';
import { Command } from '../command';
import { CommandName } from '../commandName';
import { printMeta } from '../print';
import { withExit } from '../withExit';

export class Tag extends Command<CommandName.Tag> {
  name = CommandName.Tag as const;
  description =
    "Adds one or more tags to a picture's metadata. Duplicate tags are not added twice. Tags passed to the untag option will be removed from the picture's metadata. Non-existant tags are ignored.";
  examples = [
    '<id> <tag1> [, <tag2> [, ...<tagN>]]',
    '--latest <tag1> [, <tag2> [, ...<tagN>]]',
    '<id> [<tag1> , <tag2> [, ...<tagN>]] --untag <tagA> [, <tagB> [, ...<tagC>]]',
  ];

  run(commandArgs: string[]): void {
    const {
      positionals,
      options: { latest, untag: untagList },
    } = parseArgs({
      args: commandArgs,
      positionals: [
        {
          type: ParseableType.String,
          isRequired: true,
        },
      ] as const,
      options: [
        {
          name: 'latest',
          type: ParseableType.Boolean,
        },
        {
          name: 'untag',
          type: ParseableType.StringList,
        },
      ] as const,
    });

    let tagList: string[];
    let id: string;
    if (latest) {
      id = this.picturesManager.lastPicture.id;
      tagList = positionals;
    } else {
      const inputId = positionals[0];
      id = Command.parseInputId(inputId);
      tagList = positionals.slice(1);
    }

    this.metadataManager.addTags(id, tagList);
    this.metadataManager.removeTags(id, untagList);

    const meta = this.metadataManager.getMetaById(id);
    withExit(0, printMeta, meta);
  }
}
