import { tag } from 'type-fest/source/opaque';
import { assertIsNotUndefined } from '../utils/assertIsNotUndefined';
import { Meta, MetadataManager } from './metadataManager';
import c from 'chalk';

const DIVIDER = Array.from({ length: 40 }).fill('-').join('');

export const printDivider = () => {
  console.log(DIVIDER);
};

export const printMeta = (
  meta: Meta,
  includeDivider = false,
  longestTagNameLength = 0,
  indexSet = new Set<string>(),
) => {
  const tags = [...meta.tagMap.values()].sort((tagA, tagB) => {
    if (indexSet.has(tagA.name) && !indexSet.has(tagB.name)) {
      return -1;
    }

    if (!indexSet.has(tagA.name) && indexSet.has(tagB.name)) {
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
  console.log(
    'Tags |',
    tags
      .map((tag) => {
        const tagName = tag.name.padEnd(longestTagNameLength);
        const tagNameColor = indexSet.has(tag.name) ? c.cyanBright : c.cyan;
        const valueColor = indexSet.has(tag.name) ? c.italic.bold.gray : c.gray;

        let value: string;
        if (tag.valueCount === 0) {
          value = '';
        } else if (tag.valueCount === 1) {
          const valueSingleton = tag.getValueList()[0];
          assertIsNotUndefined(valueSingleton);
          value = `${valueColor(valueSingleton)}`;
        } else {
          const valueList = `${tag.getValueList().toSorted().join(c.white(', '))}`;
          value = `[${valueColor(valueList)}]`;
        }

        return `${tagNameColor(tagName)}: ${value}`;
      })
      .join('\n     | '),
  );
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

export const printMetaList = (
  metaList: Meta[],
  metadataManager: MetadataManager,
) => {
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

  const longestTagNameLength = Math.max(
    ...metaList.flatMap((meta) => {
      return [...meta.tagMap.values()].map((tag) => tag.name.length);
    }),
  );

  const indexSet = metadataManager?.config.secondaryIndexes ?? new Set();

  sortedList.forEach((meta, index) => {
    printMeta(
      meta,
      index < metaList.length - 1,
      longestTagNameLength,
      indexSet,
    );
  });
};
