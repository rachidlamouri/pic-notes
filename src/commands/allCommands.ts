import { CommandName } from './commandName';

type CommandDefinition = {
  name: CommandName;
  isDeprecated?: true;
  description: string;
  examples: string[];
};

export const LIST_DEFAULT = 100;

export const allCommands: Record<CommandName, CommandDefinition> = {
  [CommandName.get]: {
    name: CommandName.get,
    description:
      "Prints either the latest picture's metadata or the metadata for the given id",
    examples: ['--latest', '<id>'],
  },
  [CommandName.list]: {
    name: CommandName.list,
    description: `Prints the latest n metadata. n defaults to ${LIST_DEFAULT} and must be greater than zero or less than or equal to the default.`,
    examples: ['', '<n>'],
  },
  [CommandName.last]: {
    name: CommandName.last,
    isDeprecated: true,
    description: '',
    examples: [],
  },
  [CommandName.latest]: {
    name: CommandName.latest,
    isDeprecated: true,
    description: '',
    examples: [],
  },
  [CommandName.search]: {
    name: CommandName.search,
    description: 'Prints all metadata that has every tag matched by the search',
    examples: ['tag1 [, tag2 [, ...tagN]]'],
  },
  [CommandName.tag]: {
    name: CommandName.tag,
    description:
      "Adds one or more tags to a picture's metadata. Duplicate tags are not added twice",
    examples: ['tag1 [, tag2 [, ...tagN]]'],
  },
  [CommandName.untag]: {
    name: CommandName.untag,
    description:
      "Removes one or more tags from a picture's metadata. Non-existant tags are ignored.",
    examples: ['tag1 [, tag2 [, ...tagN]]'],
  },
  [CommandName.backup]: {
    name: CommandName.backup,
    description: 'Copies pictures and metadata to the "backup" folder',
    examples: [''],
  },
};
