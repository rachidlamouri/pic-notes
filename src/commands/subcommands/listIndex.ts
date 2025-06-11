import { parseArgs } from '../../parse-args/parseArgs';
import { assertIsNotUndefined } from '../../utils/assertIsNotUndefined';
import { Command } from '../command';
import { CommandName } from '../commandName';
import { withExit } from '../withExit';

export class ListIndex extends Command<CommandName.ListIndex> {
  name = CommandName.ListIndex as const;
  description =
    'Prints all primary indexes. Can optionally print unique values for an index';
  examples = ['<tag1> [<tag2> ...<tagN>]'];

  run(commandArgs: string[]): void {
    const { positionals } = parseArgs({
      args: commandArgs,
      positionals: [],
      options: [],
    });

    const tagNameFilter =
      positionals.length === 0 ? null : new Set(positionals);
    const hasTagNameFilter = tagNameFilter !== null;

    const allTagNames = Object.keys(this.metadataManager.metadata.primaryIndex);
    const filteredTagNames = allTagNames
      .filter((tagName) => {
        const result = !hasTagNameFilter || tagNameFilter.has(tagName);
        return result;
      })
      .toSorted((a, b) => a.localeCompare(b));

    const filteredTagNamesAndValues = filteredTagNames.map<
      [string, Set<string>]
    >((tagName) => {
      if (!hasTagNameFilter) {
        return [tagName, new Set()] as const;
      }

      const ids = this.metadataManager.metadata.primaryIndex[tagName]?.ids;
      assertIsNotUndefined(ids);

      const allValues = [...ids.values()]
        .flatMap((id) => {
          const meta = this.metadataManager.getMetaById(id);
          const tag = meta.tagMap.get(tagName);
          assertIsNotUndefined(tag);
          const subvalues = tag.getValueList();
          return subvalues;
        })
        .toSorted((a, b) => a.localeCompare(b));

      const uniqueValues = new Set(allValues);
      return [tagName, uniqueValues] as const;
    });

    const formatted = filteredTagNamesAndValues
      .flatMap(([tagName, uniqueValues]) => {
        return [
          `  ${tagName}`,
          ...[...uniqueValues].map((value) => {
            return `    ${value}`;
          }),
        ];
      })
      .join('\n');

    withExit(0, console.log, formatted);
  }
}
