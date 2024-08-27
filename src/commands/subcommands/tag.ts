import { ParseableType } from '../../parse-args/parseableType';
import { parseArgs } from '../../parse-args/parseArgs';
import { assertIsString } from '../../utils/assertIsString';
import { Command } from '../command';
import { CommandName } from '../commandName';
import { printMeta } from '../print';
import { withExit } from '../withExit';
import { Tag as MetaTag } from '../metadataManager';
import { assertHasExactlyZero } from '../../utils/assertHasExactlyZero';

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

    let tagPositionals: string[];
    let id: string;
    if (latest) {
      id = this.picturesManager.lastPicture.id;
      tagPositionals = positionals;
    } else {
      const inputId = positionals[0];
      id = Command.parseInputId(inputId);
      tagPositionals = positionals.slice(1);
    }

    const tagList: MetaTag[] = tagPositionals.map((tagPositional) => {
      const [tagName, tagValue, ...rest] = tagPositional.split(':');
      assertIsString(tagName);
      assertHasExactlyZero(rest);
      return new MetaTag([tagName, tagValue]);
    });

    this.metadataManager.addTags(id, tagList);
    this.metadataManager.removeTags(id, untagList);

    const meta = this.metadataManager.getMetaById(id);
    withExit(0, printMeta, meta);
  }
}
