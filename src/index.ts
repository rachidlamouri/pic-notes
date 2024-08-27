import { PicturesManager } from './commands/picturesManager';
import { MetadataManager } from './commands/metadataManager';
import { Command } from './commands/command';
import { buildCommandsByName } from './commands/buildCommandsByName';

const picturesManager = new PicturesManager();
picturesManager.init();

const metadataManager = new MetadataManager();
metadataManager.init(picturesManager);

const { commandsByName } = buildCommandsByName({
  metadataManager,
  picturesManager,
});

const args = process.argv.slice(2);
const commandArgs = args.slice(1);

const command = Command.parseAndValidateCommandAndHelp(commandsByName, args);

command.run(commandArgs);
