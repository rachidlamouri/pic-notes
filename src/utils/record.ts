import { ValueOf } from 'type-fest';

export type RecordKey = string | number | symbol;

type KnownEntry<Key extends RecordKey, Value> = readonly [Key, Value];

type ObjectWithKnownEntries<TEntry extends KnownEntry<RecordKey, unknown>> =
  Record<TEntry[0], TEntry[1]>;

/**
 * Only use this if the entry keys are known
 */
export const objectFromKnownEntries = <
  TEntry extends KnownEntry<RecordKey, unknown>,
>(
  entries: TEntry[],
): ObjectWithKnownEntries<TEntry> => {
  return Object.fromEntries(entries) as ObjectWithKnownEntries<TEntry>;
};

type ObjectWithUnknownEntries = Record<RecordKey, unknown>;

type KnownEntriesFromObject<TRecord extends ObjectWithUnknownEntries> =
  KnownEntry<keyof TRecord, ValueOf<TRecord>>[];

/**
 * Only use this if the exact object keys are known
 */
export const entriesFromKnownObject = <
  TRecord extends ObjectWithUnknownEntries,
>(
  record: TRecord,
): KnownEntriesFromObject<TRecord> => {
  return Object.entries(record) as KnownEntriesFromObject<TRecord>;
};
