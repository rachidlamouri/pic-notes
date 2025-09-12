import P from 'parsimmon';
import { createLanguage, parserDebugger, ul } from './parserUtils';
import { isArray } from '../utils/assertIsArray';

type TagLanguage = {
  secondaryIndexKey: `${string}:${string}`;
  tagName: string;
  tagValueUnit: string[];
  tagValueList: string[];
  tagValueListExpression: string[];
  tagValueListExpressionPrime: [string, unknown] | null;
  tagValue: string;
  delimiter: ':';
};

const tagLanguage = createLanguage<TagLanguage>(parserDebugger, {
  secondaryIndexKey: (l) => {
    return P.seq(
      // -
      l.tagName,
      l.delimiter,
      l.tagValue,
    ).map(([tagName, delimiter, tagValue]) => {
      return `${tagName}${delimiter}${tagValue}` as const;
    });
  },
  tagName: () => {
    return ul.kebab;
  },
  tagValueUnit: (l) => {
    return P.alt<TagLanguage['tagValueUnit']>(
      // -
      l.tagValueList,
      l.tagValue.map((value) => {
        return [value];
      }),
    );
  },
  tagValueList: (l) => {
    0;
    return P.seq(
      // -
      P.string('['),
      P.optWhitespace,
      l.tagValueListExpression,
      P.optWhitespace,
      P.string(']'),
    ).map((result) => {
      const valueList = result[2];
      return valueList;
    });
  },
  tagValueListExpression: (l) => {
    return P.alt<TagLanguage['tagValueListExpression']>(
      // -
      P.seq(
        // -
        l.tagValue,
        l.tagValueListExpressionPrime,
      ).map((result) => {
        function assertIsPrimeResult(
          primeResult: unknown,
        ): asserts primeResult is TagLanguage['tagValueListExpressionPrime'] {
          if (
            (isArray(primeResult) && primeResult.length === 2) ||
            primeResult === null
          ) {
            return;
          }

          throw new Error('Unreachable');
        }

        const hasTwo = (list: unknown[]): list is [unknown, unknown] =>
          list.length === 2;

        const valueList = [];
        let nextPrimeResult: TagLanguage['tagValueListExpressionPrime'] =
          result;
        do {
          const value = nextPrimeResult[0];

          const primeResult: unknown = nextPrimeResult[1];
          assertIsPrimeResult(primeResult);
          nextPrimeResult = primeResult;

          valueList.push(value);
        } while (nextPrimeResult !== null);

        return valueList;
      }),
      ul.ε.map(() => []),
    );
  },
  tagValueListExpressionPrime: (l) => {
    return P.alt<TagLanguage['tagValueListExpressionPrime']>(
      // -
      P.seq(
        // -
        P.whitespace,
        l.tagValue,
        l.tagValueListExpressionPrime,
      ).map((result) => {
        return [result[1], result[2]];
      }),
      ul.ε,
    );
  },
  tagValue: () => {
    return ul.kebab;
  },
  delimiter: () => {
    return P.string(':');
  },
});

export const tl = tagLanguage;
