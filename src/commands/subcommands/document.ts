import { parseArgs } from '../../parse-args/parseArgs';
import { assertIsNotUndefined } from '../../utils/assertIsNotUndefined';
import { Command } from '../command';
import { CommandName } from '../commandName';
import { withExit } from '../withExit';
import fs from 'fs';
import { execSync } from 'child_process';
import { ParseableType } from '../../parse-args/parseableType';

type IndexEntry = {
  key: string;
  description: string;
};

export class Document extends Command<CommandName.Document> {
  name = CommandName.Document as const;
  description =
    'Enables documenting the purpose of primary or secondary index tag names. Pass the --write flag to open an editor to modify the documentation. Otherwise it simply prints the current documentation.';
  examples = ['[--write]', '[--write] [<secondary-index-tag-name>]'];

  formatEntries(entries: IndexEntry[]) {
    const column1Length = Math.max(...entries.map(({ key }) => key.length));

    const formatted = entries
      .map(({ key, description }) => {
        return `${key.padEnd(column1Length, ' ')} | ${description}`;
      })
      .join('\n');

    return formatted;
  }

  openEditor(entries: IndexEntry[]) {
    const formatted = this.formatEntries(entries);

    const filename = 'DOCUMENT.txt';
    fs.writeFileSync(filename, formatted);

    execSync(`code --wait ${filename}`, { encoding: 'utf8' });
    const newDocumentation = fs.readFileSync(filename, 'utf8');

    const descriptionByKey = Object.fromEntries(
      newDocumentation.split('\n').map((line) => {
        const split = line.split('|');

        const key = (split[0] ?? '').trim();
        const description = (split[1] ?? '').trim();

        return [key, description];
      }),
    );

    return descriptionByKey;
  }

  documentPrimaryIndex(isReadOnly: boolean) {
    const primaryIndexEntries = Object.entries(
      this.metadataManager.metadata.primaryIndex,
    )
      .map(([key, value]) => {
        return {
          key,
          description: value.description,
        };
      })
      .toSorted((a, b) => a.key.localeCompare(b.key));

    if (isReadOnly) {
      console.log(this.formatEntries(primaryIndexEntries));
    } else {
      const descriptionByKey = this.openEditor(primaryIndexEntries);

      this.metadataManager.updatePrimaryIndexDescriptions(descriptionByKey);
    }
  }

  documentSecondaryIndex(tagName: string, isReadOnly: boolean) {
    if (!this.metadataManager.config.secondaryIndexes.has(tagName)) {
      withExit(
        1,
        console.log,
        `"${tagName}" is not defined as a secondary index in .notes-config`,
      );
    }

    const secondaryIndexEntries = Object.entries(
      this.metadataManager.metadata.secondaryIndex,
    )
      // TODO: the logic for what constitutes a tag key should go elsewhere
      .filter(([key]) => key.startsWith(tagName + ':'))
      .map(([key, value]) => {
        return {
          key,
          description: value.description,
        };
      })
      .toSorted((a, b) => a.key.localeCompare(b.key));

    if (isReadOnly) {
      console.log(this.formatEntries(secondaryIndexEntries));
    } else {
      const descriptionByKey = this.openEditor(secondaryIndexEntries);

      this.metadataManager.updateSecondaryIndexDescriptions(descriptionByKey);
    }
  }

  run(commandArgs: string[]): void {
    const {
      positionals: [tagName],
      options: { write: isWriteEnabled = false },
    } = parseArgs({
      args: commandArgs,
      positionals: [],
      options: [
        {
          name: 'write',
          type: ParseableType.Boolean,
          isRequired: false,
        },
      ],
    });

    const isReadOnly = !isWriteEnabled;

    if (tagName === undefined) {
      this.documentPrimaryIndex(isReadOnly);
    } else {
      this.documentSecondaryIndex(tagName, isReadOnly);
    }

    if (isWriteEnabled) {
      console.log('Done');
    }

    withExit(0, () => {
      // no op
    });
  }
}
