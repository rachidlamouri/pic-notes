import { ParseableType } from '../../parse-args/parseableType';
import { parseArgs } from '../../parse-args/parseArgs';
import { Command } from '../command';
import { CommandName } from '../commandName';
import { printMetaList } from '../print';
import { withExit } from '../withExit';
import { Tag as MetaTag } from '../metadataManager';
import { hasAtLeastOne } from '../../utils/hasAtLeastOne';

export class Tag extends Command<CommandName.Tag> {
  name = CommandName.Tag as const;
  description =
    "Adds one or more tags to a picture's metadata. Duplicate tags are not added twice. Tags passed to the untag option will be removed from the picture's metadata. Non-existant tags are ignored.";
  examples = [
    '<id> <tag1> [, <tag2> [, ...<tagN>]]',
    '--latest <tag1> [, <tag2> [, ...<tagN>]]',
    '<id> [<tag1> , <tag2> [, ...<tagN>]] --untag <tagA> [, <tagB> [, ...<tagC>]]',
    '--ids [<id1> , <id2> [, ...<idN>]] --tags <tag1> [, <tag2> [, ...<tagN>]] --untag <tagA> [, <tagB> [, ...<tagZ>]]',
  ];

  run(commandArgs: string[]): void {
    const {
      positionals,
      options: {
        latest,
        untag: untagList,
        tags: inputTagList,
        ids: inputIdList,
      },
    } = parseArgs({
      args: commandArgs,
      positionals: [] as const,
      options: [
        {
          name: 'ids',
          type: ParseableType.StringList,
        },
        {
          name: 'tags',
          type: ParseableType.StringList,
        },
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

    if (
      (positionals.length > 0 && inputIdList.length > 0) ||
      (latest && inputIdList.length > 0) ||
      (positionals.length === 0 && !latest && inputIdList.length === 0) ||
      (positionals.length === 0 &&
        inputTagList.length === 0 &&
        untagList.length === 0)
    ) {
      withExit(1, () => {
        console.log('Invalid input');
        this.printUsage();
      });
    }

    let rawIdList: string[];
    let rawTagList: string[];
    if (latest) {
      rawIdList = [this.picturesManager.lastPicture.id];
      rawTagList = positionals;
    } else if (hasAtLeastOne(positionals)) {
      const inputId = positionals[0];
      rawIdList = [inputId];
      rawTagList = positionals.slice(1);
    } else if (inputIdList.length > 0) {
      rawIdList = inputIdList;
      rawTagList = inputTagList;
    } else {
      throw new Error('Unreachable');
    }

    const invalidRawIds = rawIdList.filter((id) => !Command.isIdParseable(id));
    if (invalidRawIds.length > 0) {
      withExit(1, console.log, 'Invalid id format:', invalidRawIds.join(', '));
    }

    const idList: string[] = rawIdList.map(Command.parseInputId);
    const tagList: MetaTag[] = rawTagList.map(MetaTag.fromSerialized);

    const invalidIdList: string[] = [];
    const validIdList: string[] = [];
    idList.forEach((id) => {
      if (this.metadataManager.hasMeta(id)) {
        validIdList.push(id);
      } else {
        invalidIdList.push(id);
      }
    });

    if (invalidIdList.length > 0) {
      withExit(1, console.log, 'Ids do not exist:', invalidIdList.join(', '));
    }

    validIdList.forEach((id) => {
      this.metadataManager.addTags(id, tagList);
      this.metadataManager.removeTags(id, untagList);
    });

    withExit(
      0,
      printMetaList,
      validIdList.map((id) => this.metadataManager.getMetaById(id)),
    );
  }
}
