import { ParseableType } from '../../parse-args/parseableType';
import { parseArgs } from '../../parse-args/parseArgs';
import { DifferenceNode } from '../../tag-language/nodes/differenceNode';
import { ExpressionNode } from '../../tag-language/nodes/expressionNode';
import { IntersectionNode } from '../../tag-language/nodes/intersectionNode';
import { OperationNode } from '../../tag-language/nodes/operationNode';
import { SelectAllNode } from '../../tag-language/nodes/selectAllNode';
import { TagNode } from '../../tag-language/nodes/tagNode';
import { UnionNode } from '../../tag-language/nodes/unionNode';
import { parseSearch } from '../../tag-language/searchParser';
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
  examples = ['tag1 [, tag2 [, ...tagN]]', '--query tag1 + tag2'];

  runQuery(query: string) {
    const rootNode = parseSearch(query);

    const compute = (node: ExpressionNode): IdSet => {
      if (node instanceof SelectAllNode) {
        const matchingIdList = Object.values(
          this.metadataManager.data.metaById,
        ).map((meta) => {
          return meta.id;
        });

        return new IdSet(matchingIdList);
      }

      if (node instanceof TagNode) {
        const matchingIdSet = this.metadataManager.getIds(node.tag);
        const matchingMetaList = [...matchingIdSet]
          .map((id) => {
            const meta = this.metadataManager.data.metaById[id];
            assertIsNotUndefined(meta);
            return meta;
          })
          .filter((meta) => {
            return hasTag(meta, node.tag);
          });

        return new IdSet(matchingMetaList.map((meta) => meta.id));
      }

      if (!(node instanceof OperationNode)) {
        throw new Error('Unhandled node of class: ' + node.constructor.name);
      }

      const left = compute(node.left);
      const right = compute(node.right);

      if (node instanceof IntersectionNode) {
        return new Set([...left].filter((leftId) => right.has(leftId)));
      }

      if (node instanceof UnionNode) {
        return new Set([...left, ...right]);
      }

      if (node instanceof DifferenceNode) {
        return new Set([...left].filter((leftId) => !right.has(leftId)));
      }

      throw new Error(
        'Unhandled OperationNode of class: ' + node.constructor.name,
      );
    };

    const idSet = compute(rootNode);
    const metaList = [...idSet].map((id) => {
      const meta = this.metadataManager.data.metaById[id];
      assertIsNotUndefined(meta);
      return meta;
    });

    printMetaList(metaList);
  }

  run(commandArgs: string[]): void {
    const {
      positionals: tagPositionalList,
      options: { ignore: ignoreOption = [], query: queryInputList = [] },
    } = parseArgs({
      args: commandArgs,
      positionals: [],
      options: [
        {
          name: 'ignore',
          type: ParseableType.StringList,
        },
        {
          name: 'query',
          type: ParseableType.StringList,
        },
      ],
    });

    if (queryInputList.length > 0) {
      const query = queryInputList.join('');
      withExit(0, this.runQuery.bind(this), query);
    }

    const searchTagList: Tag[] = tagPositionalList.map((tagPositional) => {
      return Tag.fromSerialized(tagPositional);
    });

    const ignoreTagList: Tag[] = ignoreOption.map((ignoreValue) => {
      return Tag.fromSerialized(ignoreValue);
    });

    const anyMatchingIdSet = new Set(
      searchTagList.flatMap((tag) => {
        const subset = this.metadataManager.getIds(tag);
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
