import { parseArgs } from '../../parse-args/parseArgs';
import { assertIsNotUndefined } from '../../utils/assertIsNotUndefined';
import { Command } from '../command';
import { CommandName } from '../commandName';
import { withExit } from '../withExit';
import fs from 'fs';
import { execSync } from 'child_process';

type IndexEntry = {
  key: string;
  description: string;
};

export class Document extends Command<CommandName.Document> {
  name = CommandName.Document as const;
  description =
    'Opens a text editor to enable documenting primary or secondary index values';
  examples = ['[<tagName>]'];

  openEditor(entries: IndexEntry[]) {
    const column1Length = Math.max(...entries.map(({ key }) => key.length));

    const formatted = entries
      .map(({ key, description }) => {
        return `${key.padEnd(column1Length, ' ')} | ${description}`;
      })
      .join('\n');

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

  documentPrimaryIndex() {
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

    const descriptionByKey = this.openEditor(primaryIndexEntries);

    this.metadataManager.updatePrimaryIndexDescriptions(descriptionByKey);
  }

  documentSecondaryIndex(tagName: string) {
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

    const descriptionByKey = this.openEditor(secondaryIndexEntries);

    this.metadataManager.updateSecondaryIndexDescriptions(descriptionByKey);
  }

  run(commandArgs: string[]): void {
    const {
      positionals: [tagName],
    } = parseArgs({
      args: commandArgs,
      positionals: [],
      options: [],
    });

    if (tagName === undefined) {
      this.documentPrimaryIndex();
    } else {
      this.documentSecondaryIndex(tagName);
    }

    withExit(0, console.log, 'Done');
  }
}
