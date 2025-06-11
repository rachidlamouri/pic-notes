import { ParseableType } from '../../parse-args/parseableType';
import { parseArgs } from '../../parse-args/parseArgs';
import { Command } from '../command';
import { CommandName } from '../commandName';
import { printMetaList } from '../print';
import { withExit } from '../withExit';
import { parseModification } from '../../tag-language/modificationParser';
import { Search } from './search';

export class Tag extends Command<CommandName.Tag> {
  name = CommandName.Tag as const;
  description = 'Add/remove tags and/or values. See README for syntax.';
  examples = [
    '<id> <tag-query> [--dry-run]',
    '--latest <tag-query> [--dry-run]',
    '--ids [<id1> , <id2> [, ...<idN>]] --query <tag-query> [--dry-run]',
    '--search <search-query> --query <tag-query> [--dry-run]',
    '[<id> [...<ids>]] [<tag-query>] [--latest] [--ids [<id1> [...<ids>]]] [--query <tag-query>] [--search <search-query>] [--dry-run]',
  ];

  run(commandArgs: string[]): void {
    const {
      positionals,
      options: {
        latest: wantsLatestId,
        ids: explicitOptionIds = [],
        search: searchQuery,
        'dry-run': isDryRun,
        query: explicitTagQuery,
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
          name: 'latest',
          type: ParseableType.Boolean,
        },
        {
          name: 'search',
          type: ParseableType.String,
        },
        {
          name: 'query',
          type: ParseableType.String,
        },
        {
          name: 'dry-run',
          type: ParseableType.Boolean,
        },
      ] as const,
    });

    const firstNonIdIndex = positionals.findIndex((value) => {
      return !Command.isIdParseable(value);
    });
    const explicitPositionalIds = positionals.filter((_, index) => {
      return index < firstNonIdIndex;
    });
    const implicitTagQuery =
      positionals.slice(firstNonIdIndex, positionals.length).join(' ') ||
      undefined;

    const explicitIds = [...explicitPositionalIds, ...explicitOptionIds].map(
      (id) => Command.parseInputId(id),
    );

    const invalidExplicitIdList: string[] = [];
    const validExplicitIdList: string[] = [];
    explicitIds.forEach((id) => {
      if (this.metadataManager.hasMeta(id)) {
        validExplicitIdList.push(id);
      } else {
        invalidExplicitIdList.push(id);
      }
    });

    if (invalidExplicitIdList.length > 0) {
      withExit(
        1,
        console.log,
        'The specified ids do not exist:',
        invalidExplicitIdList.join(', '),
      );
    }

    const latestIdSingleton = wantsLatestId
      ? [this.picturesManager.lastPicture.id]
      : [];

    let searchQueryIds: string[];
    if (searchQuery !== undefined) {
      const { limitedList: metaList } = Search.performSearch(
        searchQuery,
        this.metadataManager,
      );

      if (metaList === null) {
        throw new Error('Invalid search query');
      }

      if (metaList.length === 0) {
        throw new Error(`Search returned 0 results.`);
      }

      const MAX = 10;
      if (metaList.length > MAX) {
        throw new Error(
          `Search returned more than ${MAX} results. For saftey reasons the command has been aborted.`,
        );
      }

      searchQueryIds = metaList.map((meta) => meta.id);
    } else {
      searchQueryIds = [];
    }

    if (implicitTagQuery !== undefined && explicitTagQuery !== undefined) {
      withExit(1, () => {
        console.log(
          'Received both a positional and explicit tag query. Please only specify one.',
        );
        this.printUsage();
      });
    }

    const tagQuery = implicitTagQuery ?? explicitTagQuery;

    if (tagQuery === undefined) {
      withExit(1, () => {
        console.log('Missing tag query');
        this.printUsage();
      });
    }

    const allIds = [
      ...validExplicitIdList,
      ...latestIdSingleton,
      ...searchQueryIds,
    ];

    if (allIds.length === 0) {
      withExit(1, () => {
        console.log('Must specify at least one id.');
        this.printUsage();
      });
    }

    const operations = parseModification(tagQuery).operations;
    this.metadataManager.modify(allIds, operations, isDryRun);

    withExit(
      0,
      printMetaList,
      allIds.map((id) => this.metadataManager.getMetaById(id)),
    );
  }
}
