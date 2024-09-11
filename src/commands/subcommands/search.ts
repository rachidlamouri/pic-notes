import { ParseableType } from '../../parse-args/parseableType';
import { parseArgs } from '../../parse-args/parseArgs';
import { assertIsNotUndefined } from '../../utils/assertIsNotUndefined';
import { Command } from '../command';
import { CommandName } from '../commandName';
import { hasTag, IdSet, Tag } from '../metadataManager';
import { printMetaList } from '../print';
import { withExit } from '../withExit';

export class Search extends Command<CommandName.Search> {
  name = CommandName.Search as const;
  description =
    'Prints all metadata that has every tag matched by the search. If a search tag value is provided then the metadata tag values must match as well.';
  examples = ['tag1 [, tag2 [, ...tagN]]'];

  run(commandArgs: string[]): void {
    const {
      positionals: tagPositionalList,
      options: { ignore: ignoreOption = [] },
    } = parseArgs({
      args: commandArgs,
      positionals: [],
      options: [
        {
          name: 'ignore',
          type: ParseableType.StringList,
        },
      ],
    });

    const searchTagList: Tag[] = tagPositionalList.map((tagPositional) => {
      return Tag.fromSerialized(tagPositional);
    });

    const ignoreTagList: Tag[] = ignoreOption.map((ignoreValue) => {
      return Tag.fromSerialized(ignoreValue);
    });

    const anyMatchingIdSet = new Set(
      searchTagList.flatMap((tag) => {
        const subset =
          this.metadataManager.data.idSetByTagName[tag.name] ?? new IdSet();
        return [...subset];
      }),
    );

    const allMatchingMetaList = [...anyMatchingIdSet]
      .map((id) => {
        const meta = this.metadataManager.data.metaById[id];
        assertIsNotUndefined(meta);
        return meta;
      })
      .filter((meta) => {
        const hasEverySearchTag = searchTagList.every((searchTag) => {
          return hasTag(meta, searchTag);
        });

        const hasSomeIgnoreTags = ignoreTagList.some((ignoreTag) => {
          return hasTag(meta, ignoreTag);
        });

        return hasEverySearchTag && !hasSomeIgnoreTags;
      });

    withExit(0, printMetaList, allMatchingMetaList);
  }
}
