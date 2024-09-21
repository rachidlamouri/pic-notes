import { Command } from '../command';
import { CommandName } from '../commandName';
import { PicturesManager } from '../picturesManager';
import { Timestamp } from '../timestamp';
import { withExit } from '../withExit';
import { posix } from 'path';
import fs from 'fs';
import { MetadataManager } from '../metadataManager';

export class Backup extends Command<CommandName.Backup> {
  name = CommandName.Backup as const;
  description = 'Prints all metadata that has every tag matched by the search';
  examples = ['tag1 [, tag2 [, ...tagN]]'];

  run(_commandArgs: string[]): void {
    const BACKUP_DIR = 'backup';
    const timestamp = Timestamp.fromNow();
    const destinationDirectoryName = posix.join(
      BACKUP_DIR,
      timestamp.formatted,
    );

    fs.mkdirSync(destinationDirectoryName);
    fs.cpSync(
      PicturesManager.PICS_DIR,
      posix.join(destinationDirectoryName, PicturesManager.PICS_DIR),
      { recursive: true },
    );
    fs.cpSync(
      MetadataManager.METADATA_FILE_PATH,
      posix.join(destinationDirectoryName, MetadataManager.METADATA_FILE_PATH),
    );

    withExit(0, console.log, 'Backed up to: ' + destinationDirectoryName);
  }
}
