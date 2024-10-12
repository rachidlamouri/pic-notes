import { ParseableType } from '../../parse-args/parseableType';
import { parseArgs } from '../../parse-args/parseArgs';
import { parseSearch } from '../../tag-language/searchParser';
import { Command } from '../command';
import { CommandName } from '../commandName';
import { printDivider, printMetaList } from '../print';
import { withExit } from '../withExit';

export class Search extends Command<CommandName.Search> {
  static DEFAULT_LIMIT = 100;

  name = CommandName.Search as const;
  description = `Looks up metadata by tag name and values. See README for syntax. Accepts an optional "limit" option that defaults to ${Search.DEFAULT_LIMIT} and must be less than or equal to ${Search.DEFAULT_LIMIT}.`;
  examples = ['<query>', '<query> --limit <n>'];

  // runQuery(query: string) {
  //   const rootNode = parseSearch(query);

  //   const compute = (node: ExpressionNode): IdSet => {
  //     if (node instanceof SelectAllNode) {
  //       const matchingIdList = Object.values(
  //         this.metadataManager.data.metaById,
  //       ).map((meta) => {
  //         return meta.id;
  //       });

  //       return new IdSet(matchingIdList);
  //     }

  //     if (node instanceof TagNode) {
  //       const matchingIdSet = this.metadataManager.getIds(node.tag);
  //       const matchingMetaList = [...matchingIdSet]
  //         .map((id) => {
  //           const meta = this.metadataManager.data.metaById[id];
  //           assertIsNotUndefined(meta);
  //           return meta;
  //         })
  //         .filter((meta) => {
  //           return hasTag(meta, node.tag);
  //         });

  //       return new IdSet(matchingMetaList.map((meta) => meta.id));
  //     }

  //     if (!(node instanceof OperationNode)) {
  //       throw new Error('Unhandled node of class: ' + node.constructor.name);
  //     }

  //     const left = compute(node.left);
  //     const right = compute(node.right);

  //     if (node instanceof IntersectionNode) {
  //       return new Set([...left].filter((leftId) => right.has(leftId)));
  //     }

  //     if (node instanceof UnionNode) {
  //       return new Set([...left, ...right]);
  //     }

  //     if (node instanceof DifferenceNode) {
  //       return new Set([...left].filter((leftId) => !right.has(leftId)));
  //     }

  //     throw new Error(
  //       'Unhandled OperationNode of class: ' + node.constructor.name,
  //     );
  //   };

  //   const idSet = compute(rootNode);
  //   const metaList = [...idSet].map((id) => {
  //     const meta = this.metadataManager.data.metaById[id];
  //     assertIsNotUndefined(meta);
  //     return meta;
  //   });

  //   printMetaList(metaList);
  // }

  run(commandArgs: string[]): void {
    const {
      positionals,
      options: { limit = 100 },
    } = parseArgs({
      args: commandArgs,
      positionals: [],
      options: [
        {
          name: 'limit',
          type: ParseableType.Number,
        },
      ],
    });

    if (limit < 1 || limit > Search.DEFAULT_LIMIT) {
      withExit(1, () => {
        console.log('Invalid limit');
        this.printUsage();
      });
    }

    const query = positionals.join(' ');
    const rootNode = parseSearch(query);

    if (rootNode === null) {
      withExit(0, () => {
        this.printUsage();
      });
    }

    const idSet = rootNode.compute(this.metadataManager);
    const resultList = [...idSet].map((id) =>
      this.metadataManager.getMetaById(id),
    );
    const limitedList = resultList.slice(0, limit);

    withExit(0, () => {
      console.log(`Found ${resultList.length}; Showing ${limitedList.length}`);
      printDivider();
      printMetaList(limitedList);
    });
  }
}
