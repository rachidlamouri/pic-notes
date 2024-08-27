import { assertIsNotUndefined } from '../../utils/assertIsNotUndefined';
import { Command } from '../command';
import { CommandName } from '../commandName';
import { IdSet, Tag } from '../metadataManager';
import { printMetaList } from '../print';
import { withExit } from '../withExit';

export class Search extends Command<CommandName.Search> {
  name = CommandName.Search as const;
  description =
    'Prints all metadata that has every tag matched by the search. If a search tag value is provided then the metadata tag values must match as well.';
  examples = ['tag1 [, tag2 [, ...tagN]]'];

  run(commandArgs: string[]): void {
    const tagPositionalList = commandArgs;
    const searchTagList: Tag[] = tagPositionalList.map((tagPositional) => {
      return Tag.fromSerialized(tagPositional);
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
        return searchTagList.every((searchTag) => {
          const savedTag = meta.tagMap.get(searchTag.name);

          return (
            savedTag !== undefined &&
            (searchTag.value === undefined ||
              savedTag.value === searchTag.value)
          );
        });
      });

    withExit(0, printMetaList, allMatchingMetaList);
  }
}
