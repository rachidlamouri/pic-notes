import { assertIsNotUndefined } from '../../utils/assertIsNotUndefined';
import { Command } from '../command';
import { CommandName } from '../commandName';
import { printMetaList } from '../print';
import { withExit } from '../withExit';

export class Search extends Command<CommandName.Search> {
  name = CommandName.Search as const;
  description = 'Prints all metadata that has every tag matched by the search';
  examples = ['tag1 [, tag2 [, ...tagN]]'];

  run(commandArgs: string[]): void {
    const tagList = commandArgs;

    const anyMatchingIdSet = new Set(
      tagList.flatMap((tag) => {
        const subset = this.metadataManager.data.idSetByTag[tag] ?? new Set();
        return [...subset];
      }),
    );

    const allMatchingIdList = [...anyMatchingIdSet].filter((id) => {
      const meta = this.metadataManager.data.metaById[id];
      assertIsNotUndefined(meta);
      return tagList.every((tag) => meta.tagSet.has(tag));
    });

    const metaList = allMatchingIdList.map((id) => {
      const meta = this.metadataManager.data.metaById[id];
      assertIsNotUndefined(meta);
      return meta;
    });

    withExit(0, printMetaList, metaList);
  }
}
