export enum CommandName {
  list = 'list',
  latest = 'latest',
  get = 'get',
  search = 'search',
  last = 'last',
  tag = 'tag',
  untag = 'untag',
  backup = 'backup',
}

export const COMMAND_NAME_OPTIONS = Object.values(CommandName);

export const isCommandName = (value: string): value is CommandName => {
  return (COMMAND_NAME_OPTIONS as string[]).includes(value);
};
