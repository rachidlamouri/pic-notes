import { UnionToIntersection } from 'type-fest';
import { Command } from './command';
import { CommandName } from './commandName';
import { Latest } from './subcommands/latest';
import { List } from './subcommands/list';
import { Get } from './subcommands/get';
import { Search } from './subcommands/search';
import { Last } from './subcommands/last';
import { Tag } from './subcommands/tag';
import { Untag } from './subcommands/untag';
import { Backup } from './subcommands/backup';
import { RebuildIndexes } from './subcommands/rebuildIndexes';
import { MetadataManager } from './metadataManager';
import { PicturesManager } from './picturesManager';
import { Combine } from './subcommands/combine';
import { ListIndex } from './subcommands/listIndex';
import { Describe } from './subcommands/describe';
import { Document } from './subcommands/document';

export type Managers = {
  metadataManager: MetadataManager;
  picturesManager: PicturesManager;
};

export type CommandsByName = UnionToIntersection<{
  [TCommandName in CommandName]: Command<TCommandName>;
}>;

export const buildCommandsByName = (managers: Managers) => {
  const get = new Get(managers);
  const tag = new Tag(managers);

  const commandsByName: CommandsByName = {
    [CommandName.List]: new List(managers),
    [CommandName.Latest]: new Latest({
      ...managers,
      replacement: get,
    }),
    [CommandName.Get]: get,
    [CommandName.Search]: new Search(managers),
    [CommandName.Last]: new Last({
      ...managers,
      replacement: get,
    }),
    [CommandName.Tag]: tag,
    [CommandName.Untag]: new Untag({
      ...managers,
      replacement: tag,
    }),
    [CommandName.Backup]: new Backup(managers),
    [CommandName.RebuildIndexes]: new RebuildIndexes(managers),
    [CommandName.Combine]: new Combine(managers),
    [CommandName.ListIndex]: new ListIndex(managers),
    [CommandName.Describe]: new Describe(managers),
    [CommandName.Document]: new Document(managers),
  };

  return { commandsByName };
};
