import { CommandName, COMMAND_NAME_OPTIONS } from './commandName';
import { allCommands } from './allCommands';
import { Meta, MetadataManager } from './metadataManager';
import { withExit } from './withExit';

export const printUsage = (command: CommandName, replacement?: CommandName) => {
  if (replacement) {
    console.log(
      `Command "${command}" is deprecated. Use "${replacement}" instead.\n`,
    );
  }

  const commandToPrint = replacement ?? command;
  const usageToPrint = allCommands[commandToPrint];

  if (replacement || !allCommands[command].isDeprecated) {
    console.log(commandToPrint + ': ' + usageToPrint.description);

    const examples = usageToPrint.examples.map(
      (example) => `  notes ${commandToPrint} ` + example,
    );
    examples.forEach((example) => {
      console.log(example);
    });
  }
};

export const printHelp = () => {
  console.log('notes <command> [...args]');
  console.log();

  COMMAND_NAME_OPTIONS.toSorted().forEach((command) => {
    const usage = allCommands[command];
    if (!usage.isDeprecated) {
      printUsage(command);
      console.log();
    }
  });
};

const DIVIDER = Array.from({ length: 40 }).fill('-').join('');

const printMeta = (meta: Meta, includeDivider = false) => {
  console.log('Id   |', meta.id);
  console.log('File |', meta.filePath);
  console.log('Tags |', [...meta.tagSet].join(', '));

  if (includeDivider) {
    console.log(DIVIDER);
  }
};

export const printMetaList = (metaList: Meta[]) => {
  if (metaList.length === 0) {
    console.log('NO DATA');
  }

  const sortedList = [...metaList].sort((metaA, metaB) => {
    if (metaA.filePath < metaB.filePath) {
      return 1;
    }

    if (metaA.filePath === metaB.filePath) {
      return 0;
    }

    return -1;
  });

  sortedList.forEach((meta, index) => {
    printMeta(meta, index < metaList.length - 1);
  });
};

export const buildPrintMetaById = (dataManager: MetadataManager) => {
  return (id: string) => {
    const meta = dataManager.data.metaById[id];

    if (!meta) {
      withExit(0, console.log, 'Id "' + id + '" does not exist');
    }

    printMeta(meta);
  };
};
