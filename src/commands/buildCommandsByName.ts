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
import { MetadataManager } from './metadataManager';
import { PicturesManager } from './picturesManager';

export type Managers = {
  metadataManager: MetadataManager;
  picturesManager: PicturesManager;
};

export type CommandsByName = UnionToIntersection<{
  [TCommandName in CommandName]: Command<TCommandName>;
}>;

export const buildCommandsByName = (managers: Managers) => {
  const get = new Get(managers);

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
    [CommandName.Tag]: new Tag(managers),
    [CommandName.Untag]: new Untag(managers),
    [CommandName.Backup]: new Backup(managers),
  };

  return { commandsByName };
};
