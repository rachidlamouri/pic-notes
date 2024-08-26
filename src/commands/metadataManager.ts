import { assertIsStringArray, assertIsArray } from '../utils/assertIsArray';
import { assertIsNotUndefined } from '../utils/assertIsNotUndefined';
import { assertIsObject } from '../utils/assertIsObject';
import { assertIsString } from '../utils/assertIsString';
import { PicturesManager } from './picturesManager';
import fs from 'fs';
import { withExit } from './withExit';

type MetaJson = {
  id: string;
  filePath: string;
  tagSet: string[];
};

export type Meta = {
  id: string;
  filePath: string;
  tagSet: Set<string>;
};

function assertIsMetaJson(value: unknown): asserts value is MetaJson {
  assertIsObject(value);
  assertIsString(value.id);
  assertIsString(value.filePath);
  assertIsStringArray(value.tagSet);
}

type Metadata = {
  metaById: Record<string, Meta>;
  idByFileName: Record<string, string>;
  idSetByTag: Record<string, Set<string>>;
};

export class MetadataManager {
  data: Metadata = {
    metaById: {},
    idByFileName: {},
    idSetByTag: {},
  };

  static FILE_PATH = '.metadata';

  init(picsManager: PicturesManager) {
    const pictureList = picsManager.pictureList;
    let data = this.read();

    const guaranteedMetaById = Object.fromEntries(
      pictureList.map((pic) => {
        const guaranteedMeta = {
          id: pic.id,
          filePath: pic.filePath,
          tagSet: data.metaById[pic.id]?.tagSet ?? new Set(),
        };
        return [pic.id, guaranteedMeta];
      }),
    );

    const guaranteedIdByFileName = Object.fromEntries(
      pictureList.map((pic) => {
        const guaranteedId =
          pic.fileName in data.idByFileName
            ? data.idByFileName[pic.fileName]
            : pic.id;
        assertIsString(guaranteedId);
        return [pic.fileName, guaranteedId];
      }),
    );

    const guaranteedIdSetByTag: Record<string, Set<string>> = {};
    pictureList
      .flatMap((pic) => {
        const meta = guaranteedMetaById[pic.id];
        assertIsNotUndefined(meta);
        return [...meta.tagSet].map((tag) => {
          return {
            pic,
            tag,
          };
        });
      })
      .forEach(({ pic, tag }) => {
        const guaranteedIdSet = new Set(guaranteedIdSetByTag[tag] ?? []);
        guaranteedIdSet.add(pic.id);
        guaranteedIdSetByTag[tag] = guaranteedIdSet;
      });

    const guaranteedData: Metadata = {
      metaById: guaranteedMetaById,
      idByFileName: guaranteedIdByFileName,
      idSetByTag: guaranteedIdSetByTag,
    };

    this.write(guaranteedData);
    this.data = guaranteedData;
  }

  read() {
    const text = fs.readFileSync(MetadataManager.FILE_PATH, 'utf8');

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = {
        metaById: {},
        idByFileName: {},
        idSetByTag: {},
      } satisfies Metadata;
    }

    assertIsObject(data);
    assertIsObject(data.metaById);
    assertIsObject(data.idByFileName);
    assertIsObject(data.idSetByTag);

    const modifiedMetaById = Object.fromEntries(
      Object.entries(data.metaById ?? {}).map(([id, meta]) => {
        assertIsMetaJson(meta);
        return [id, { ...meta, tagSet: new Set(meta.tagSet) }];
      }),
    );

    const modifiedIdSetByTag = Object.fromEntries(
      Object.entries(data.idSetByTag ?? {}).map(([tag, idList]) => {
        assertIsArray(idList);
        idList.every(assertIsString);
        return [tag, new Set(idList)];
      }),
    );

    return {
      metaById: modifiedMetaById,
      idByFileName: data.idByFileName ?? {},
      idSetByTag: modifiedIdSetByTag,
    };
  }

  write(data: Metadata) {
    const modifiedMetaById = Object.fromEntries(
      Object.entries(data.metaById ?? {}).map(([id, meta]) => {
        return [id, { ...meta, tagSet: [...meta.tagSet] }];
      }),
    );

    const modifiedIdSetByTag = Object.fromEntries(
      Object.entries(data.idSetByTag ?? {}).map(([tag, idSet]) => {
        return [tag, [...idSet]];
      }),
    );

    const stringifiableData = {
      metaById: modifiedMetaById,
      idByFileName: data.idByFileName,
      idSetByTag: modifiedIdSetByTag,
    };

    const text = JSON.stringify(stringifiableData, null, 2);
    fs.writeFileSync(MetadataManager.FILE_PATH, text);
  }

  addTags(id: string, tagList: string[]) {
    const meta = this.getMetaById(id);

    tagList.forEach((tag) => {
      meta.tagSet.add(tag);
    });

    this.write(this.data);
  }

  removeTags(id: string, tagList: string[]) {
    const meta = this.getMetaById(id);

    tagList.forEach((tag) => {
      meta.tagSet.delete(tag);
    });

    this.write(this.data);
  }

  getMetaById(id: string): Meta {
    const meta = this.data.metaById[id];
    if (meta === undefined) {
      withExit(1, console.log, `Meta with id "${id}" does not exist`);
    }
    return meta;
  }
}
