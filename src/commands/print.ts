import { Meta } from './metadataManager';

const DIVIDER = Array.from({ length: 40 }).fill('-').join('');

export const printMeta = (meta: Meta, includeDivider = false) => {
  const tags = [...meta.tagMap.values()].sort((tagA, tagB) => {
    if (tagA.value !== undefined && tagB.value === undefined) {
      return -1;
    }

    if (tagA.value === undefined && tagB.value !== undefined) {
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
  console.log('Tags |', tags.map((tag) => tag.serialized).join(', '));
  if (meta.description !== undefined) {
    console.log('Desc |', meta.description);
  }

  if (includeDivider) {
    console.log(DIVIDER);
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
