import { Command } from './command';

type CommandDefinition = {
  name: Command;
  isDeprecated?: true;
  description: string;
  examples: string[];
};

export const LIST_DEFAULT = 100;

export const allCommands: Record<Command, CommandDefinition> = {
  [Command.get]: {
    name: Command.get,
    description:
      "Prints either the latest picture's metadata or the metadata for the given id",
    examples: ['--latest', '<id>'],
  },
  [Command.list]: {
    name: Command.list,
    description: `Prints the latest n metadata. n defaults to ${LIST_DEFAULT} and must be greater than zero or less than or equal to the default.`,
    examples: ['', '<n>'],
  },
  [Command.last]: {
    name: Command.last,
    isDeprecated: true,
    description: '',
    examples: [],
  },
  [Command.latest]: {
    name: Command.latest,
    isDeprecated: true,
    description: '',
    examples: [],
  },
  [Command.search]: {
    name: Command.search,
    description: 'Prints all metadata that has every tag matched by the search',
    examples: ['tag1 [, tag2 [, ...tagN]]'],
  },
  [Command.tag]: {
    name: Command.tag,
    description:
      "Adds one or more tags to a picture's metadata. Duplicate tags are not added twice",
    examples: ['tag1 [, tag2 [, ...tagN]]'],
  },
  [Command.untag]: {
    name: Command.untag,
    description:
      "Removes one or more tags from a picture's metadata. Non-existant tags are ignored.",
    examples: ['tag1 [, tag2 [, ...tagN]]'],
  },
  [Command.backup]: {
    name: Command.backup,
    description: 'Copies pictures and metadata to the "backup" folder',
    examples: [''],
  },
};
