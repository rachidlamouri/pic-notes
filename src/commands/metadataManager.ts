import {
  assertIsStringArray,
  assertIsArray,
  isArray,
} from '../utils/assertIsArray';
import { assertIsNotUndefined } from '../utils/assertIsNotUndefined';
import { assertHasStringValues, assertIsObject } from '../utils/assertIsObject';
import { assertIsString, isString } from '../utils/assertIsString';
import { PicturesManager } from './picturesManager';
import fs from 'fs';
import { withExit } from './withExit';
import { assertHasExactlyZero } from '../utils/assertHasExactlyZero';

type TagTupleJson = readonly [name: string, value: string];

type TagJson = TagName | TagTupleJson;

type TagTuple = readonly [name: string, value?: string];

type TagValue = TagTuple[1];

type TagName = TagTuple[0];

export class Tag {
  name: TagName;
  value: TagValue;

  static fromSerialized(serializedTag: string): Tag {
    const [tagName, tagValue, ...rest] = serializedTag.split(':');
    assertIsString(tagName);
    assertHasExactlyZero(rest);
    return new Tag([tagName, tagValue]);
  }

  constructor(tuple: TagTuple) {
    this.name = tuple[0];
    this.value = tuple[1];
  }

  get serialized() {
    const valuePart = this.value === undefined ? '' : `:${this.value}`;

    return `${this.name}${valuePart}`;
  }
}

export class IdSet extends Set<string> {}

class TagMap extends Map<TagName, Tag> {}

type MetaJson = {
  id: string;
  filePath: string;
  tagSet: TagJson[];
};

export type Meta = {
  id: string;
  filePath: string;
  tagMap: TagMap;
};

export const hasTag = (meta: Meta, tag: Tag) => {
  const savedTag = meta.tagMap.get(tag.name);

  return (
    savedTag !== undefined &&
    (tag.value === undefined || savedTag.value === tag.value)
  );
};

function assertIsTagSetJson(
  tagSet: unknown[],
): asserts tagSet is MetaJson['tagSet'] {
  const isTagSetJson = tagSet.every((tag) => {
    return (
      isString(tag) ||
      (isArray(tag) &&
        (tag.length === 1 || tag.length === 2) &&
        isString(tag[0]) &&
        (isString(tag[1]) || tag[1] === undefined))
    );
  });

  if (!isTagSetJson) {
    throw new Error('Unexpected non tagSet');
  }
}

function assertIsMetaJson(value: unknown): asserts value is MetaJson {
  assertIsObject(value);
  assertIsString(value.id);
  assertIsString(value.filePath);
  assertIsArray(value.tagSet);
  assertIsTagSetJson(value.tagSet);
}

type MetadataJson = {
  metaById: Record<Meta['id'], MetaJson>;
  idByFileName: Record<string, Meta['id']>;
  idSetByTagName: Record<TagName, string[]>;
};

type Metadata = {
  metaById: Record<Meta['id'], Meta>;
  idByFileName: Record<string, Meta['id']>;
  idSetByTagName: Record<TagName, IdSet>;
};

export class MetadataManager {
  data: Metadata = {
    metaById: {},
    idByFileName: {},
    idSetByTagName: {},
  };

  static FILE_PATH = '.metadata';

  init(picsManager: PicturesManager) {
    const pictureList = picsManager.pictureList;
    let data = this.read();

    const guaranteedMetaById: Metadata['metaById'] = Object.fromEntries(
      pictureList.map((pic) => {
        const guaranteedMeta: Meta = {
          id: pic.id,
          filePath: pic.filePath,
          tagMap: data.metaById[pic.id]?.tagMap ?? new TagMap(),
        };
        return [pic.id, guaranteedMeta];
      }),
    );

    const guaranteedIdByFileName: Metadata['idByFileName'] = Object.fromEntries(
      pictureList.map((pic) => {
        const guaranteedId =
          pic.fileName in data.idByFileName
            ? data.idByFileName[pic.fileName]
            : pic.id;
        assertIsString(guaranteedId);
        return [pic.fileName, guaranteedId];
      }),
    );

    const guaranteedIdSetByTagName: Record<TagName, IdSet> = {};
    pictureList
      .flatMap((pic) => {
        const meta = guaranteedMetaById[pic.id];
        assertIsNotUndefined(meta);
        return [...meta.tagMap].map(([tagName]) => {
          return {
            pic,
            tagName,
          };
        });
      })
      .forEach(({ pic, tagName }) => {
        const guaranteedIdSet =
          guaranteedIdSetByTagName[tagName] ?? new IdSet();
        guaranteedIdSet.add(pic.id);
        guaranteedIdSetByTagName[tagName] = guaranteedIdSet;
      });

    const guaranteedData: Metadata = {
      metaById: guaranteedMetaById,
      idByFileName: guaranteedIdByFileName,
      idSetByTagName: guaranteedIdSetByTagName,
    };

    this.write(guaranteedData);
    this.data = guaranteedData;
  }

  read(): Metadata {
    const text = fs.readFileSync(MetadataManager.FILE_PATH, 'utf8');

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = {
        metaById: {},
        idByFileName: {},
        idSetByTagName: {},
      } satisfies Metadata;
    }

    assertIsObject(data);
    assertIsObject(data.metaById);
    assertIsObject(data.idByFileName);
    assertHasStringValues(data.idByFileName);
    data.idSetByTagName = data.idSetByTag ?? data.idSetByTagName;
    assertIsObject(data.idSetByTagName);

    const modifiedMetaById: Metadata['metaById'] = Object.fromEntries(
      Object.entries(data.metaById).map(([id, metaJson]) => {
        assertIsMetaJson(metaJson);
        const { tagSet, ...submeta } = metaJson;
        return [
          id,
          {
            ...submeta,
            tagMap: new TagMap(
              tagSet.map((tagJson) => {
                const tag = new Tag(
                  isString(tagJson) ? [tagJson, undefined] : tagJson,
                );

                return [tag.name, tag];
              }),
            ),
          } satisfies Meta,
        ];
      }),
    );

    const modifiedIdSetByTagName: Metadata['idSetByTagName'] =
      Object.fromEntries(
        Object.entries(data.idSetByTagName).map(([tag, idList]) => {
          assertIsArray(idList);
          assertIsStringArray(idList);
          return [tag, new IdSet(idList)];
        }),
      );

    return {
      metaById: modifiedMetaById,
      idByFileName: data.idByFileName ?? {},
      idSetByTagName: modifiedIdSetByTagName,
    };
  }

  write(data: Metadata) {
    const modifiedMetaById: MetadataJson['metaById'] = Object.fromEntries(
      Object.entries(data.metaById).map(([id, meta]) => {
        const metaJson: MetaJson = {
          id,
          filePath: meta.filePath,
          tagSet: [...meta.tagMap.values()].map((tag) => {
            if (tag.value === undefined) {
              return tag.name;
            }

            return [tag.name, tag.value];
          }),
        };
        return [id, metaJson];
      }),
    );

    const modifiedIdSetByTag: MetadataJson['idSetByTagName'] =
      Object.fromEntries(
        Object.entries(data.idSetByTagName).map(([tagName, idSet]) => {
          return [tagName, [...idSet]];
        }),
      );

    const metadataJson: MetadataJson = {
      metaById: modifiedMetaById,
      idByFileName: data.idByFileName,
      idSetByTagName: modifiedIdSetByTag,
    };

    const text = JSON.stringify(metadataJson, null, 2);
    fs.writeFileSync(MetadataManager.FILE_PATH, text);
  }

  addTags(id: string, tagList: Tag[]) {
    const meta = this.getMetaById(id);

    tagList.forEach((tag) => {
      meta.tagMap.set(tag.name, tag);
    });

    this.write(this.data);
  }

  removeTags(id: string, tagNameList: string[]) {
    const meta = this.getMetaById(id);

    tagNameList.forEach((tag) => {
      meta.tagMap.delete(tag);
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

  hasMeta(id: string): boolean {
    const meta = this.data.metaById[id];
    return meta !== undefined;
  }
}
