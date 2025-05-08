export enum CommandName {
  List = 'list',
  Latest = 'latest',
  Get = 'get',
  Search = 'search',
  Last = 'last',
  Tag = 'tag',
  Untag = 'untag',
  Backup = 'backup',
  RebuildIndexes = 'rebuild-indexes',
  Combine = 'combine',
  ListIndex = 'list-index',
  Describe = 'describe',
}

const COMMAND_NAME_OPTIONS = Object.values(CommandName);

export const isCommandName = (value: string): value is CommandName => {
  return (COMMAND_NAME_OPTIONS as string[]).includes(value);
};
