import { ParseableType } from '../../parse-args/parseableType';
import { parseArgs } from '../../parse-args/parseArgs';
import { Command } from '../command';
import { CommandName } from '../commandName';
import { printMetaList } from '../print';
import { withExit } from '../withExit';
import { parseModification } from '../../tag-language/modificationParser';

export class Tag extends Command<CommandName.Tag> {
  name = CommandName.Tag as const;
  description = 'Add/remove tags and/or values. See README for syntax.';
  examples = [
    '<id> <tag-query>',
    '--latest <tag-query>',
    '--ids [<id1> , <id2> [, ...<idN>]] --tags <tag-query>',
  ];

  run(commandArgs: string[]): void {
    const {
      positionals,
      options: { latest, ids: inputIdList = [] },
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
      ] as const,
    });

    let rawIdList: string[];
    let positionalQueryTextList: string[];
    if (latest) {
      rawIdList = [this.picturesManager.lastPicture.id];
      positionalQueryTextList = positionals;
    } else if (inputIdList.length > 0) {
      rawIdList = inputIdList;
      positionalQueryTextList = positionals;
    } else if (positionals[0] !== undefined) {
      rawIdList = [positionals[0]];
      positionalQueryTextList = positionals.slice(1);
    } else {
      withExit(1, () => {
        console.log('Missing id');
        this.printUsage();
      });
    }

    const {
      options: { query: optionQueryTextList = [] },
    } = parseArgs({
      args: commandArgs,
      positionals: [] as const,
      options: [
        {
          name: 'query',
          type: ParseableType.StringList,
        },
      ] as const,
    });

    const positionalQuery = positionalQueryTextList.join(' ').trim();
    const optionQuery = optionQueryTextList.join(' ').trim();

    if (positionalQuery.length > 0 && optionQuery.length > 0) {
      withExit(1, () => {
        console.log('Invalid input');
        this.printUsage();
      });
    }

    const query = positionalQuery || optionQuery;

    const invalidRawIds = rawIdList.filter((id) => !Command.isIdParseable(id));
    if (invalidRawIds.length > 0) {
      withExit(1, console.log, 'Invalid id format:', invalidRawIds.join(', '));
    }

    const idList: string[] = rawIdList.map(Command.parseInputId);

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

    const operations = parseModification(query).operations;
    this.metadataManager.modify(validIdList, operations);

    withExit(
      0,
      printMetaList,
      validIdList.map((id) => this.metadataManager.getMetaById(id)),
    );
  }
}
