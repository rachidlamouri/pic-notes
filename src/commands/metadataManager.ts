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

type SerializedTag = string;

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
  description?: string;
};

export type Meta = {
  id: string;
  filePath: string;
  tagMap: TagMap;
  description: string | undefined;
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
  if (value.description !== undefined) {
    assertIsString(value.description);
  }
}

type MetadataJson = {
  metaById: Record<Meta['id'], MetaJson>;
  idSetByTagName?: Record<TagName, string[]>;
  primaryIndex?: Record<TagName, string[]>;
  secondaryIndex?: Record<SerializedTag, string[]>;
};

type Metadata = {
  metaById: Record<Meta['id'], Meta>;
  primaryIndex: Record<TagName, IdSet>;
  secondaryIndex: Record<SerializedTag, IdSet>;
};

type ConfigJson = {
  secondaryIndexes: string[];
};

type Config = {
  secondaryIndexes: Set<string>;
};

export class MetadataManager {
  data: Metadata = {
    metaById: {},
    primaryIndex: {},
    secondaryIndex: {},
  };

  config: Config = {
    secondaryIndexes: new Set(),
  };

  static METADATA_FILE_PATH = '.metadata';
  static CONFIG_FILE_PATH = '.notes-config';

  init(picsManager: PicturesManager) {
    const pictureList = picsManager.pictureList;
    let { metadata: data, config } = this.read();

    const guaranteedMetaById: Metadata['metaById'] = Object.fromEntries(
      pictureList.map((pic) => {
        const guaranteedMeta: Meta = {
          id: pic.id,
          filePath: pic.filePath,
          tagMap: data.metaById[pic.id]?.tagMap ?? new TagMap(),
          description: data.metaById[pic.id]?.description,
        };
        return [pic.id, guaranteedMeta];
      }),
    );

    const pictureTagList = pictureList.flatMap((pic) => {
      const meta = guaranteedMetaById[pic.id];
      assertIsNotUndefined(meta);
      return [...meta.tagMap.values()].map((tag) => {
        return {
          pic,
          tag,
        };
      });
    });

    const guaranteedPrimaryIndex: Record<TagName, IdSet> = {};
    pictureTagList.forEach(({ pic, tag }) => {
      const guaranteedIndex = guaranteedPrimaryIndex[tag.name] ?? new IdSet();
      guaranteedIndex.add(pic.id);
      guaranteedPrimaryIndex[tag.name] = guaranteedIndex;
    });

    const guaranteedSecondaryIndex: Record<SerializedTag, IdSet> = {};
    pictureTagList
      .filter(({ tag }) => config.secondaryIndexes.has(tag.name))
      .forEach(({ pic, tag }) => {
        const guaranteedIndex =
          guaranteedSecondaryIndex[tag.serialized] ?? new IdSet();
        guaranteedIndex.add(pic.id);
        guaranteedSecondaryIndex[tag.serialized] = guaranteedIndex;
      });

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
        const guaranteedIdSet = guaranteedPrimaryIndex[tagName] ?? new IdSet();
        guaranteedIdSet.add(pic.id);
        guaranteedPrimaryIndex[tagName] = guaranteedIdSet;
      });

    const guaranteedData: Metadata = {
      metaById: guaranteedMetaById,
      primaryIndex: guaranteedPrimaryIndex,
      secondaryIndex: guaranteedSecondaryIndex,
    };

    this.write(guaranteedData);
    this.data = guaranteedData;
    this.config = config;
  }

  readMetadata(): Metadata {
    const text = fs.readFileSync(MetadataManager.METADATA_FILE_PATH, 'utf8');

    const data: unknown = JSON.parse(text);

    assertIsObject(data);
    assertIsObject(data.metaById);
    data.primaryIndex =
      data.idSetByTag ?? data.idSetByTagName ?? data.primaryIndex;
    assertIsObject(data.primaryIndex);
    data.secondaryIndex = data.secondaryIndex ?? {};
    assertIsObject(data.secondaryIndex);

    const modifiedMetaById: Metadata['metaById'] = Object.fromEntries(
      Object.entries(data.metaById).map(([id, metaJson]) => {
        assertIsMetaJson(metaJson);
        const { tagSet, description, ...submeta } = metaJson;
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
            description,
          } satisfies Meta,
        ];
      }),
    );

    const modifiedPrimaryIndex: Metadata['primaryIndex'] = Object.fromEntries(
      Object.entries(data.primaryIndex).map(([tagName, idList]) => {
        assertIsArray(idList);
        assertIsStringArray(idList);
        return [tagName, new IdSet(idList)];
      }),
    );

    const modifiedSecondaryIndex: Metadata['secondaryIndex'] =
      Object.fromEntries(
        Object.entries(data.secondaryIndex).map(([serializedTag, idList]) => {
          assertIsArray(idList);
          assertIsStringArray(idList);
          return [serializedTag, new IdSet(idList)];
        }),
      );

    return {
      metaById: modifiedMetaById,
      primaryIndex: modifiedPrimaryIndex,
      secondaryIndex: modifiedSecondaryIndex,
    };
  }

  readConfig(): Config {
    const text = fs.readFileSync(MetadataManager.CONFIG_FILE_PATH, 'utf8');

    const data = JSON.parse(text);

    assertIsObject(data);
    assertIsArray(data.secondaryIndexes);
    assertIsStringArray(data.secondaryIndexes);

    const config: Config = {
      secondaryIndexes: new Set(data.secondaryIndexes),
    };

    return config;
  }

  read(): { metadata: Metadata; config: Config } {
    return {
      metadata: this.readMetadata(),
      config: this.readConfig(),
    };
  }

  write(data: Metadata) {
    const modifiedMetaById: MetadataJson['metaById'] = Object.fromEntries(
      Object.entries(data.metaById).map(([id, meta]) => {
        const metaJson: MetaJson = {
          id,
          filePath: meta.filePath,
          tagSet: [...meta.tagMap.values()]
            .toSorted((tagA, tagB) => {
              return tagA.name.localeCompare(tagB.name);
            })
            .map((tag) => {
              if (tag.value === undefined) {
                return tag.name;
              }

              return [tag.name, tag.value];
            }),
          description: meta.description,
        };
        return [id, metaJson];
      }),
    );

    const modifiedPrimaryIndex: MetadataJson['primaryIndex'] =
      Object.fromEntries(
        Object.entries(data.primaryIndex)
          .toSorted(([tagNameA], [tagNameB]) => {
            return tagNameA.localeCompare(tagNameB);
          })
          .map(([tagName, idSet]) => {
            return [tagName, [...idSet]];
          }),
      );

    const modifiedSecondaryIndex: MetadataJson['primaryIndex'] =
      Object.fromEntries(
        Object.entries(data.secondaryIndex)
          .toSorted(([serializedTagA], [serializedTagB]) => {
            return serializedTagA.localeCompare(serializedTagB);
          })
          .map(([serializedTag, idSet]) => {
            return [serializedTag, [...idSet]];
          }),
      );

    const metadataJson: MetadataJson = {
      metaById: modifiedMetaById,
      primaryIndex: modifiedPrimaryIndex,
      secondaryIndex: modifiedSecondaryIndex,
    };

    const text = JSON.stringify(metadataJson, null, 2);
    fs.writeFileSync(MetadataManager.METADATA_FILE_PATH, text);
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

  updateDescription(id: string, description: string | undefined) {
    const meta = this.getMetaById(id);
    meta.description = description;

    this.write(this.data);
  }

  getIds(tag: Tag): IdSet {
    if (tag.value !== undefined && this.config.secondaryIndexes.has(tag.name)) {
      return this.data.secondaryIndex[tag.serialized] ?? new IdSet();
    }

    return this.data.primaryIndex[tag.name] ?? new IdSet();
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

  rebuildIndexes() {
    const metaTags = Object.values(this.data.metaById).flatMap((meta) => {
      return [...meta.tagMap.values()].map((tag) => {
        return {
          meta,
          tag,
        };
      });
    });

    this.data.primaryIndex = {};
    metaTags.forEach(({ meta, tag }) => {
      const idSet = this.data.primaryIndex[tag.name] ?? new IdSet();
      idSet.add(meta.id);
      this.data.primaryIndex[tag.name] = idSet;
    });

    this.data.secondaryIndex = {};
    metaTags.forEach(({ meta, tag }) => {
      const idSet = this.data.secondaryIndex[tag.serialized] ?? new IdSet();
      idSet.add(meta.id);
      this.data.secondaryIndex[tag.serialized] = idSet;
    });

    this.write(this.data);
  }
}
