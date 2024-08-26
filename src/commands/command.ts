export enum Command {
  list = 'list',
  latest = 'latest',
  get = 'get',
  search = 'search',
  last = 'last',
  tag = 'tag',
  untag = 'untag',
  backup = 'backup',
}

export const COMMAND_OPTIONS = Object.values(Command);

export const isCommand = (value: string): value is Command => {
  return (COMMAND_OPTIONS as string[]).includes(value);
};
