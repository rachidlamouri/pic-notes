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
import { unknown, z } from 'zod';
import { HighlightSpanKind } from 'typescript';
import { tl } from '../tag-language/tagParser';
import { SetFieldType, SetOptional } from 'type-fest';
import {
  GenericModificationOperationNode,
  ModificationOperationNode,
} from '../tag-language/nodes/modification-nodes/modificationOperationNode';
import { LookupOperationNode } from '../tag-language/nodes/search-nodes/lookup-operations/lookupOperationNode';

const TagNameSchema = z.string();
export type TagName = z.infer<typeof TagNameSchema>;

const TagValueSchema = z.string();
export type TagValue = z.infer<typeof TagValueSchema>;

const TagValueListSchema = z.array(TagValueSchema);
export type TagValueList = z.infer<typeof TagValueListSchema>;

class TagValueSet extends Set<string> {}

/** @deprecated */
const TagTupleSchema = z.tuple([TagNameSchema, TagValueSchema]);
/** @deprecated */
type TagTuple = z.infer<typeof TagTupleSchema>;

export class Tag {
  name: TagName;
  private valueSet: TagValueSet;

  constructor(name: TagName, valueList: TagValueList) {
    this.name = name;
    this.valueSet = new TagValueSet(valueList);
  }

  rename(newName: TagName) {
    this.name = newName;
  }

  isEqual(tag: Tag) {
    return (
      this.valueCount === tag.valueCount &&
      this.getValueList().every((value) => tag.hasValue(value))
    );
  }

  hasValue(value: TagValue) {
    return this.valueSet.has(value);
  }

  addToValueSet(value: TagValue) {
    this.valueSet.add(value);
  }

  removeFromValueSet(value: TagValue) {
    this.valueSet.delete(value);
  }

  get valueCount(): number {
    return this.valueSet.size;
  }

  getValueList() {
    return [...this.valueSet];
  }

  static buildSecondaryIndexKey(
    tagName: TagName,
    tagValue: TagValue,
  ): SecondaryIndexKey {
    return `${tagName}:${tagValue}`;
  }

  getSecondaryIndexKeys(): SecondaryIndexKey[] {
    return this.getValueList().map((value): SecondaryIndexKey => {
      return Tag.buildSecondaryIndexKey(this.name, value);
    });
  }

  serialize() {
    let valuePart: string;
    if (this.valueCount === 0) {
      valuePart = '';
    } else if (this.valueCount === 1) {
      const value = this.getValueList()[0];
      assertIsNotUndefined(value);
      valuePart = `:${value}`;
    } else {
      valuePart = `:[${this.getValueList().toSorted().join(', ')}]`;
    }

    return `${this.name}${valuePart}`;
  }

  // get serialized() {
  //   let valuePart: string;
  //   if (this.valueList.length > 1) {
  //     valuePart = `:[${this.valueList.join(',')}]`;
  //   } else if (this.valueList[0] !== undefined) {
  //     valuePart = `:${this.valueList[0]}`;
  //   } else {
  //     valuePart = '';
  //   }

  //   return `${this.name}${valuePart}`;
  // }
}

/** @deprecated */
const TagSetSchema = z.array(z.union([TagNameSchema, TagTupleSchema]));
type TagSetJson = z.infer<typeof TagSetSchema>;

const TagMapSchema = z.record(TagNameSchema, TagValueListSchema);
type TagMapJson = z.infer<typeof TagMapSchema>;

class TagMap extends Map<TagName, Tag> {
  static fromJson(tagMapJson: TagMapJson): TagMap {
    const jsonEntries = Object.entries(tagMapJson);
    const entries = jsonEntries.map(([tagName, tagValueList]) => {
      const tag = new Tag(tagName, tagValueList);
      return [tagName, tag] as const;
    });
    return new TagMap(entries);
  }
}

const MetaIdSchema = z.string();
export type MetaId = z.infer<typeof MetaIdSchema>;

const MetaSchema = z.object({
  id: MetaIdSchema,
  filePath: z.string(),
  tagSet: TagSetSchema.optional(),
  tagMap: TagMapSchema.optional(),
  description: z.string().optional(),
});
type MetaJson = z.infer<typeof MetaSchema>;

type MetaInput = {
  id: string;
  filePath: string;
  tagMap: TagMap;
  description: string | undefined;
};
export class Meta implements MetaInput {
  id: string;
  filePath: string;
  tagMap: TagMap;
  description: string | undefined;

  constructor({ id, filePath, tagMap, description }: MetaInput) {
    this.id = id;
    this.filePath = filePath;
    this.tagMap = tagMap;
    this.description = description;
  }

  hasTag(tagName: string): boolean {
    return this.tagMap.has(tagName);
  }

  getTag(tagName: TagName): Tag {
    const tag = this.tagMap.get(tagName);
    assertIsNotUndefined(tag);
    return tag;
  }

  getAllTags(): Tag[] {
    return [...this.tagMap.values()];
  }

  setTag(tag: Tag) {
    this.tagMap.set(tag.name, tag);
  }

  removeTag(tagName: TagName): void {
    this.tagMap.delete(tagName);
  }

  setDescription(description: string | undefined) {
    this.description = description;
  }

  toJson(): MetaJson {
    const tagMapJson: TagMapJson = Object.fromEntries(
      [...this.tagMap.values()].map((tag) => {
        const sortedValueList = tag
          .getValueList()
          .toSorted((valueA, valueB) => {
            return valueA.localeCompare(valueB);
          });
        return [tag.name, sortedValueList];
      }),
    );

    const metaJson: MetaJson = {
      id: this.id,
      filePath: this.filePath,
      tagMap: tagMapJson,
      description: this.description,
    };

    return metaJson;
  }

  static fromJson(metaJson: MetaJson): Meta {
    const {
      id,
      filePath,
      description,
      tagSet: tagSetJson,
      tagMap: tagMapJson,
    } = metaJson;

    let tagMapEntryInputs: [TagName, TagValueList][];
    if (tagMapJson !== undefined) {
      tagMapEntryInputs = Object.entries(tagMapJson).map(
        ([tagName, tagValueList]) => {
          return [tagName, tagValueList];
        },
      );
    } else if (tagSetJson !== undefined) {
      tagMapEntryInputs = tagSetJson.map((element) => {
        let tagName: TagName;
        let tagValueList: TagValueList;

        if (typeof element === 'string') {
          tagName = element;
          tagValueList = [];
        } else {
          tagName = element[0];
          tagValueList = [element[1]];
        }

        return [tagName, tagValueList];
      });
    } else {
      tagMapEntryInputs = [];
    }

    const tagMap = new TagMap(
      tagMapEntryInputs.map(([tagName, tagValueList]) => {
        const tag = new Tag(tagName, tagValueList);
        return [tagName, tag];
      }),
    );

    return new Meta({
      id,
      filePath,
      tagMap,
      description,
    });
  }
}

const IdSetSchema = z.array(MetaIdSchema);
type IdSetJson = z.infer<typeof IdSetSchema>;

export class IdSet extends Set<string> {}

const MetaByIdSchema = z.record(MetaIdSchema, MetaSchema);
type MetaByJsonId = z.infer<typeof MetaByIdSchema>;

type MetaById = Record<Meta['id'], Meta>;

const IndexValueV1Schema = IdSetSchema;
const IndexValueV2Schema = z.object({
  description: z.string(),
  ids: IdSetSchema,
});
const IndexValueSchema = z.union([IndexValueV1Schema, IndexValueV2Schema]);
type IndexValueJson = z.infer<typeof IndexValueSchema>;

class IndexValue {
  description: string;
  ids: IdSet;

  constructor(description: string, ids: IdSet) {
    this.description = description;
    this.ids = ids;
  }

  static fromJson(json: IndexValueJson): IndexValue {
    const description = Array.isArray(json) ? '' : json.description;
    const ids = new IdSet(Array.isArray(json) ? json : json.ids);

    const value = new IndexValue(description, ids);
    return value;
  }

  toJson(): IndexValueJson {
    const serializedIds = [...this.ids];

    if (this.description === '') {
      return serializedIds;
    }

    return {
      description: this.description,
      ids: serializedIds,
    };
  }
}

const PrimaryIndexSchema = z.record(TagNameSchema, IndexValueSchema);
type PrimaryIndexJson = z.infer<typeof PrimaryIndexSchema>;

type PrimaryIndex = Record<TagName, IndexValue>;

type SecondaryIndexKey = `${TagName}:${TagValue}`;
const SecondaryIndexKeySchema = z.custom<SecondaryIndexKey>(
  (value: unknown) => {
    return (
      typeof value === 'string' && tl.secondaryIndexKey.parse(value).status
    );
  },
);

type SecondaryIndexJson = Record<SecondaryIndexKey, IndexValueJson>;
const SecondaryIndexSchema = z.custom<SecondaryIndexJson>((value: unknown) => {
  return z.record(SecondaryIndexKeySchema, IndexValueSchema).safeParse(value)
    .success;
});

type SecondaryIndex = Record<SecondaryIndexKey, IndexValue>;
const getEntriesForRecordKeyedBySecondaryIndexKey = <T>(
  record: Record<SecondaryIndexKey, T>,
): [SecondaryIndexKey, T][] => {
  return Object.entries(record) as [SecondaryIndexKey, T][];
};
const getRecordForEntriesWithSecondaryIndexKey = <T>(
  entries: [SecondaryIndexKey, T][],
): Record<SecondaryIndexKey, T> => {
  return Object.fromEntries(entries);
};

const MetadataSchema = z.object({
  metaById: MetaByIdSchema,
  /** @deprecated */
  idSetByTag: PrimaryIndexSchema.optional(),
  /** @deprecated */
  idSetByTagName: PrimaryIndexSchema.optional(),
  primaryIndex: PrimaryIndexSchema.optional(),
  secondaryIndex: SecondaryIndexSchema.optional(),
});
type MetadataJson = SetOptional<
  SetFieldType<
    z.infer<typeof MetadataSchema>,
    'secondaryIndex',
    SecondaryIndexJson
  >,
  'secondaryIndex'
>;

type MetadataInput = {
  metaById: MetaById;
  primaryIndex: PrimaryIndex;
  secondaryIndex: SecondaryIndex;
};
class Metadata implements MetadataInput {
  metaById: MetaById;
  primaryIndex: PrimaryIndex;
  secondaryIndex: SecondaryIndex;

  constructor({ metaById, primaryIndex, secondaryIndex }: MetadataInput) {
    this.metaById = metaById;
    this.primaryIndex = primaryIndex;
    this.secondaryIndex = secondaryIndex;
  }

  toJson(): MetadataJson {
    const metaByIdJson: MetadataJson['metaById'] = Object.fromEntries(
      Object.entries(this.metaById).map(([id, meta]) => {
        const metaJson = meta.toJson();
        return [id, metaJson];
      }),
    );

    const primaryIndexJson: PrimaryIndexJson = Object.fromEntries(
      Object.entries(this.primaryIndex)
        .toSorted(([tagNameA], [tagNameB]) => {
          return tagNameA.localeCompare(tagNameB);
        })
        .map(([tagName, indexValue]) => {
          return [tagName, indexValue.toJson()];
        }),
    );

    const secondaryIndexEntries = getEntriesForRecordKeyedBySecondaryIndexKey(
      this.secondaryIndex,
    );
    const secondaryIndexJson: SecondaryIndexJson =
      getRecordForEntriesWithSecondaryIndexKey(
        secondaryIndexEntries
          .toSorted(([secondaryIndexKeyA], [secondaryIndexKeyB]) => {
            return secondaryIndexKeyA.localeCompare(secondaryIndexKeyB);
          })
          .map(([secondaryIndexKey, indexValue]) => {
            return [secondaryIndexKey, indexValue.toJson()];
          }),
      );

    const metadataJson: MetadataJson = {
      metaById: metaByIdJson,
      primaryIndex: primaryIndexJson,
      secondaryIndex: secondaryIndexJson,
    };

    return metadataJson;
  }

  static fromJson(metadataJson: MetadataJson): Metadata {
    const metaById: Metadata['metaById'] = Object.fromEntries(
      Object.entries(metadataJson.metaById).map(([id, metaJson]) => {
        const meta = Meta.fromJson(metaJson);
        return [id, meta];
      }),
    );

    const primaryIndexJson: PrimaryIndexJson =
      metadataJson.idSetByTag ??
      metadataJson.idSetByTagName ??
      metadataJson.primaryIndex ??
      {};
    const primaryIndex: Metadata['primaryIndex'] = Object.fromEntries(
      Object.entries(primaryIndexJson).map(([tagName, indexValueJson]) => {
        return [tagName, IndexValue.fromJson(indexValueJson)];
      }),
    );

    const secondaryIndexJson: SecondaryIndexJson =
      metadataJson.secondaryIndex ?? {};
    const secondaryIndexJsonEntries =
      getEntriesForRecordKeyedBySecondaryIndexKey(secondaryIndexJson);
    const secondaryIndex: SecondaryIndex =
      getRecordForEntriesWithSecondaryIndexKey(
        secondaryIndexJsonEntries.map(
          ([serializedIndexKey, indexValueJson]: [
            SecondaryIndexKey,
            IndexValueJson,
          ]) => {
            return [serializedIndexKey, IndexValue.fromJson(indexValueJson)];
          },
        ),
      );

    return new Metadata({
      metaById,
      primaryIndex,
      secondaryIndex,
    });
  }
}

const ConfigSchema = z.object({
  secondaryIndexes: IdSetSchema,
});
type ConfigJson = z.infer<typeof ConfigSchema>;

type ConfigInput = {
  secondaryIndexes: Set<TagName>;
};
class Config {
  secondaryIndexes: Set<TagName>;

  constructor({ secondaryIndexes }: ConfigInput) {
    this.secondaryIndexes = secondaryIndexes;
  }

  static fromJson(configJson: ConfigJson) {
    return new Config({
      secondaryIndexes: new Set(configJson.secondaryIndexes),
    });
  }
}

export class MetadataManager {
  metadata: Metadata = new Metadata({
    metaById: {},
    primaryIndex: {},
    secondaryIndex: {},
  });

  config = new Config({
    secondaryIndexes: new Set(),
  });

  static FREEFORM_FILE_PATH = 'freeform';
  static METADATA_FILE_PATH = '.metadata';
  static CONFIG_FILE_PATH = '.notes-config';

  init(picsManager: PicturesManager) {
    const pictureList = picsManager.pictureList;
    const { metadata, config } = this.read();

    const guaranteedMetaById: MetaById = Object.fromEntries(
      pictureList.map((pic) => {
        const guaranteedMeta = new Meta({
          id: pic.id,
          filePath: pic.filePath,
          tagMap: metadata.metaById[pic.id]?.tagMap ?? new TagMap(),
          description: metadata.metaById[pic.id]?.description,
        });
        return [pic.id, guaranteedMeta];
      }),
    );

    const pictureTagList = pictureList.flatMap((pic) => {
      const meta = guaranteedMetaById[pic.id];
      assertIsNotUndefined(meta);
      return meta.getAllTags().map((tag) => {
        return {
          pic,
          tag,
        };
      });
    });

    const guaranteedPrimaryIndex: PrimaryIndex = {};
    pictureTagList.forEach(({ pic, tag }) => {
      const guaranteedIndexValue: IndexValue =
        guaranteedPrimaryIndex[tag.name] ??
        new IndexValue(
          metadata.primaryIndex[tag.name]?.description ?? '',
          new IdSet(),
        );

      guaranteedIndexValue.ids.add(pic.id);
      guaranteedPrimaryIndex[tag.name] = guaranteedIndexValue;
    });

    const guaranteedSecondaryIndex: SecondaryIndex = {};
    pictureTagList
      .filter(({ tag }) => config.secondaryIndexes.has(tag.name))
      .flatMap(({ pic, tag }) => {
        return tag.getValueList().flatMap((value) => {
          return {
            pic,
            tag,
            value,
          };
        });
      })
      .forEach(({ pic, tag, value }) => {
        const key: SecondaryIndexKey = `${tag.name}:${value}`;

        const guaranteedIndexValue =
          guaranteedSecondaryIndex[key] ??
          new IndexValue(
            metadata.secondaryIndex[key]?.description ?? '',
            new IdSet(),
          );
        guaranteedIndexValue.ids.add(pic.id);
        guaranteedSecondaryIndex[key] = guaranteedIndexValue;
      });

    const guaranteedMetadata = new Metadata({
      metaById: guaranteedMetaById,
      primaryIndex: guaranteedPrimaryIndex,
      secondaryIndex: guaranteedSecondaryIndex,
    });

    this.write(guaranteedMetadata);
    this.metadata = guaranteedMetadata;
    this.config = config;
  }

  private readMetadata(): Metadata {
    const defaultData: MetadataJson = {
      metaById: {},
    };

    const text = fs.readFileSync(MetadataManager.METADATA_FILE_PATH, 'utf8');
    const unknownData: unknown = text === '' ? defaultData : JSON.parse(text);

    const metadataJson: MetadataJson = MetadataSchema.parse(unknownData);
    const metadata = Metadata.fromJson(metadataJson);

    return metadata;
  }

  private readConfig(): Config {
    const defaultData: ConfigJson = {
      secondaryIndexes: [],
    };

    const text = fs.readFileSync(MetadataManager.CONFIG_FILE_PATH, 'utf8');
    const unknownData: unknown = text === '' ? defaultData : JSON.parse(text);

    const configJson: ConfigJson = ConfigSchema.parse(unknownData);
    const config = Config.fromJson(configJson);

    return config;
  }

  private read(): { metadata: Metadata; config: Config } {
    return {
      metadata: this.readMetadata(),
      config: this.readConfig(),
    };
  }

  private write(metadata: Metadata): void {
    const metadataJson = metadata.toJson();
    const text = JSON.stringify(metadataJson, null, 2);

    fs.writeFileSync(MetadataManager.METADATA_FILE_PATH, text);
  }

  updatePrimaryIndexDescriptions(descriptionByKey: Record<string, string>) {
    Object.entries(this.metadata.primaryIndex).forEach(([key, indexValue]) => {
      indexValue.description = descriptionByKey[key] ?? indexValue.description;
    });

    this.write(this.metadata);
  }

  updateSecondaryIndexDescriptions(
    descriptionByKey: Record<SecondaryIndexKey, string>,
  ) {
    getEntriesForRecordKeyedBySecondaryIndexKey(
      this.metadata.secondaryIndex,
    ).forEach(([key, indexValue]) => {
      indexValue.description = descriptionByKey[key] ?? indexValue.description;
    });

    this.write(this.metadata);
  }

  modify(
    ids: MetaId[],
    operations: GenericModificationOperationNode[],
    isDryRun: boolean,
  ) {
    const metaList = ids.map((id) => this.getMetaById(id));

    operations.forEach((operation) => {
      metaList.forEach((meta) => {
        operation.apply(meta);
      });
    });

    if (isDryRun) {
      console.log('-------');
      console.log('DRY RUN');
      console.log('-------');
    } else {
      this.write(this.metadata);
    }
  }

  getIds(tagName: TagName, tagValueList: TagValueList): IdSet {
    if (tagValueList.length > 0 && this.config.secondaryIndexes.has(tagName)) {
      const pseudoTag = new Tag(tagName, tagValueList);

      const ids = pseudoTag.getSecondaryIndexKeys().flatMap((key) => {
        const set = this.metadata.secondaryIndex[key]?.ids ?? new IdSet();
        return [...set];
      });

      const result = new IdSet(ids);
      return result;
    }

    const result = this.metadata.primaryIndex[tagName]?.ids ?? new IdSet();
    return result;
  }

  getMetaById(id: string): Meta {
    const meta = this.metadata.metaById[id];
    if (meta === undefined) {
      withExit(1, console.log, `Meta with id "${id}" does not exist`);
    }
    return meta;
  }

  hasMeta(id: string): boolean {
    const meta = this.metadata.metaById[id];
    return meta !== undefined;
  }

  rebuildIndexes() {
    const metaTags = Object.values(this.metadata.metaById).flatMap((meta) => {
      return meta.getAllTags().map((tag) => {
        return {
          meta,
          tag,
        };
      });
    });

    this.metadata.primaryIndex = {};
    metaTags.forEach(({ meta, tag }) => {
      const indexValue =
        this.metadata.primaryIndex[tag.name] ?? new IndexValue('', new IdSet());

      indexValue.ids.add(meta.id);
      this.metadata.primaryIndex[tag.name] = indexValue;
    });

    this.metadata.secondaryIndex = {};
    metaTags
      .filter(({ tag }) => this.config.secondaryIndexes.has(tag.name))
      .flatMap(({ meta, tag }) => {
        return tag.getSecondaryIndexKeys().map((secondaryKey) => {
          return {
            meta,
            tag,
            secondaryKey,
          };
        });
      })
      .forEach(({ meta, secondaryKey }) => {
        const indexValue =
          this.metadata.secondaryIndex[secondaryKey] ??
          new IndexValue('', new IdSet());

        indexValue.ids.add(meta.id);
        this.metadata.secondaryIndex[secondaryKey] = indexValue;
      });

    this.write(this.metadata);
  }

  merge(metaList: Meta[]) {
    const [firstMeta, ...otherMetaList] = metaList;
    assertIsNotUndefined(firstMeta);

    otherMetaList.forEach((meta) => {
      meta.getAllTags().forEach((tag) => {
        firstMeta.setTag(
          new Tag(tag.name, [
            ...(firstMeta.hasTag(tag.name)
              ? firstMeta.getTag(tag.name).getValueList()
              : []),
            ...tag.getValueList(),
          ]),
        );
      });
    });

    firstMeta.description = metaList
      .map((meta) => {
        const description = meta.description ?? '-------------------';
        return `${meta.id.replace('_', ':').replace(/(\d{2})(\d)-(\d)(\d{2})/, '$1-$2$3-$4')}\n${description}`;
      })
      .join('\n\n');

    otherMetaList.forEach((meta) => {
      meta.description =
        (meta.description !== undefined ? meta.description + '\n\n' : '') +
        `MERGED WITH ${firstMeta.filePath}`;
    });

    this.write(this.metadata);
  }
}
