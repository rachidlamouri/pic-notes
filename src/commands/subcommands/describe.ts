import { ParseableType } from '../../parse-args/parseableType';
import { parseArgs } from '../../parse-args/parseArgs';
import { AddDescriptionOperationNode } from '../../tag-language/nodes/modification-nodes/addDescriptionOperationNode';
import { assertIsString } from '../../utils/assertIsString';
import { Command } from '../command';
import { CommandName } from '../commandName';
import { printMeta, printNoData } from '../print';
import { withExit } from '../withExit';
import { execSync, spawnSync } from 'child_process';
import fs from 'fs';

export class Describe extends Command<CommandName.Describe> {
  name = CommandName.Describe as const;
  description = 'Opens vscode to modify the description of a picture';
  examples = ['<id>'];

  run(commandArgs: string[]): void {
    const {
      positionals: [inputId],
      options: { latest },
    } = parseArgs({
      args: commandArgs,
      positionals: [
        {
          type: ParseableType.String,
        },
      ],
      options: [
        {
          name: 'latest',
          type: ParseableType.Boolean,
        },
      ],
    });

    if ((latest && inputId !== undefined) || (!latest && !inputId)) {
      console.log('Must provide exactly one of "--latest" or <id>');
      withExit(1, this.printUsage.bind(this));
    }

    let id: string;
    if (latest && inputId === undefined) {
      const potentialId = this.picturesManager.lastPicture?.id;

      if (!potentialId) {
        withExit(0, printNoData);
      }

      id = potentialId;
    } else {
      assertIsString(inputId);
      id = Command.parseInputId(inputId);
    }

    const meta = this.metadataManager.getMetaById(id);

    const filename = 'DESCRIBE.md';
    fs.writeFileSync(filename, meta.description ?? '');

    execSync(`code --wait ${filename}`, { encoding: 'utf8' });
    const newDescription = fs.readFileSync(filename, 'utf8');

    this.metadataManager.modify(
      [id],
      [new AddDescriptionOperationNode(newDescription)],
    );

    withExit(0, printMeta, meta);
  }
}
