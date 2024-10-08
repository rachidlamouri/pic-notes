// import { ValueOf } from 'type-fest';
// import { RecordKey } from './record';

// type KnownEntry<TKey, TValue> = [TKey, TValue];

// type KnownEntries<TRecord extends Record<RecordKey, unknown>> = KnownEntry<
//   keyof TRecord,
//   ValueOf<TRecord>
// >[];

// export const entriesFromKnownObject = <
//   TRecord extends Record<RecordKey, unknown>,
// >(
//   record: TRecord,
// ): KnownEntries<typeof record>[] => {
//   return Object.entries(record) as KnownEntries<typeof record>[];
// };
