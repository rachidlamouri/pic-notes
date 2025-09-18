import { Meta } from './metadataManager';

const DIVIDER = Array.from({ length: 40 }).fill('-').join('');

export const printDivider = () => {
  console.log(DIVIDER);
};

export const printMeta = (meta: Meta, includeDivider = false) => {
  const tags = [...meta.tagMap.values()].sort((tagA, tagB) => {
    if (tagA.valueCount > 0 && tagB.valueCount === 0) {
      return -1;
    }

    if (tagA.valueCount === 0 && tagB.valueCount > 0) {
      return 1;
    }

    if (tagA.name < tagB.name) {
      return -1;
    }

    if (tagA.name === tagB.name) {
      return 0;
    }

    return 1;
  });

  console.log('Id   |', meta.id);
  console.log('File |', meta.filePath);
  console.log('Tags |', tags.map((tag) => tag.serialize()).join(', '));
  if (meta.description !== undefined) {
    const formattedDescription = meta.description
      .split('\n')
      .map((line, index) => {
        const prefix = index === 0 ? 'Desc | ' : '     | ';
        return `${prefix}${line}`;
      })
      .join('\n');

    console.log(formattedDescription);
  }

  if (includeDivider) {
    printDivider();
  }
};

export const printNoData = () => {
  console.log('NO DATA');
};

export const printMetaList = (metaList: Meta[]) => {
  if (metaList.length === 0) {
    printNoData();
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
