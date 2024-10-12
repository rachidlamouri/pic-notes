import P from 'parsimmon';
import { isArray } from '../utils/assertIsArray';
import { Constructor } from 'type-fest';
import { createLanguage, parserDebugger, ul } from './parserUtils';
import {
  GenericSearchOperationNode,
  SearchOperationNode,
} from './nodes/search-nodes/searchOperationNode';
import { HasTagNameOperationNode } from './nodes/search-nodes/lookup-operations/hasTagNameOperationNode';
import { tl } from './tagParser';
import { HasAnyTagValueOperationNode } from './nodes/search-nodes/lookup-operations/hasAnyTagValueOperationNode';
import { HasAllTagValuesOperationNode } from './nodes/search-nodes/lookup-operations/hasAllTagValuesOperationNode';
import { HasExactTagValuesOperationNode } from './nodes/search-nodes/lookup-operations/hasExactTagValuesOperationNode';
import { SelectAllOperationNode } from './nodes/search-nodes/lookup-operations/selectAllOperationNode';
import { IntersectionOperationNode } from './nodes/search-nodes/set-operations/intersectionOperationNode';
import { UnionOperationNode } from './nodes/search-nodes/set-operations/unionOperationNode';
import { DifferenceOperationNode } from './nodes/search-nodes/set-operations/differenceOperationNode';

enum Operator {
  Intersection = '^',
  Union = '+',
  Difference = '-',
}

type OperationChainEnd = [Operator, GenericSearchOperationNode];

type NestedAccumulatedOperation = [
  Operator,
  GenericSearchOperationNode,
  unknown,
];

type AccumulatedOperation = NestedAccumulatedOperation | OperationChainEnd;

const isOperator = (datum: unknown): datum is Operator => {
  return (
    typeof datum === 'string' &&
    (<string[]>Object.values(Operator)).includes(datum)
  );
};

const isNestedAccumulatedOperation = (
  datum: AccumulatedOperation,
): datum is NestedAccumulatedOperation => {
  return datum.length === 3;
};

const isAccumulatedOperation = (
  datum: unknown,
): datum is AccumulatedOperation => {
  return (
    isArray(datum) &&
    (datum.length === 2 || datum.length === 3) &&
    isOperator(datum[0]) &&
    datum[1] instanceof SearchOperationNode
  );
};

function assertIsAccumulatedOperation(
  datum: unknown,
): asserts datum is AccumulatedOperation {
  if (isAccumulatedOperation(datum)) {
    return;
  }

  throw new Error('Expected an AccumulatedOperation, but received: ' + datum);
}

const operationConstructorByOperator: Record<
  Operator,
  Constructor<GenericSearchOperationNode>
> = {
  [Operator.Intersection]: IntersectionOperationNode,
  [Operator.Union]: UnionOperationNode,
  [Operator.Difference]: DifferenceOperationNode,
};

const associateLeft = ([leftExpression, accumulatedOperation]: [
  GenericSearchOperationNode,
  AccumulatedOperation,
]): GenericSearchOperationNode => {
  const operator = accumulatedOperation[0];
  const Operation = operationConstructorByOperator[operator];

  const rightExpression: GenericSearchOperationNode = accumulatedOperation[1];

  let expression: GenericSearchOperationNode;
  if (isNestedAccumulatedOperation(accumulatedOperation)) {
    const nextLeftExpression = new Operation(leftExpression, rightExpression);
    const nextAccumulatedOperation: unknown = accumulatedOperation[2];
    assertIsAccumulatedOperation(nextAccumulatedOperation);

    expression = associateLeft([nextLeftExpression, nextAccumulatedOperation]);
  } else {
    expression = new Operation(leftExpression, rightExpression);
  }

  return expression;
};

type SearchLanguage = {
  search: GenericSearchOperationNode | null;
  subexpression1: GenericSearchOperationNode;
  subexpression1Prime: AccumulatedOperation | null;
  subexpression2: GenericSearchOperationNode;
  subexpression2Prime: AccumulatedOperation | null;
  subexpression3: GenericSearchOperationNode;
  subexpression4: GenericSearchOperationNode;
  searchOperation: GenericSearchOperationNode;
  hasExactTagValuesOperation: HasExactTagValuesOperationNode;
  hasAllTagValuesOperation: HasAllTagValuesOperationNode;
  hasAnyTagValueOperation: HasAnyTagValueOperationNode;
  hasTagNameOperation: HasTagNameOperationNode;
  selectAllOperation: SelectAllOperationNode;
};

const searchLanguage = createLanguage<SearchLanguage>(parserDebugger, {
  search: (l) => {
    return P.seq(
      // -
      P.optWhitespace,
      P.alt<SearchLanguage['search']>(
        // -
        l.subexpression1,
        ul.ε,
      ),
      P.optWhitespace,
    ).map((result) => {
      const expression = result[1];
      return expression;
    });
  },
  subexpression1: (l) => {
    return P.seq(
      // -
      l.subexpression2,
      l.subexpression1Prime,
    ).map((result) => {
      const subexpression2: GenericSearchOperationNode = result[0];
      const subexpression1Prime: AccumulatedOperation | null = result[1];

      if (subexpression1Prime === null) {
        return subexpression2;
      }

      const expression = associateLeft([subexpression2, subexpression1Prime]);
      return expression;
    });
  },
  subexpression1Prime: (l) => {
    return P.alt<SearchLanguage['subexpression1Prime']>(
      P.seq(
        // -
        P.optWhitespace,
        P.alt(
          // -
          P.string(Operator.Union),
          P.string(Operator.Difference),
        ),
        P.optWhitespace,
        l.subexpression2,
        l.subexpression1Prime,
      ).map((result) => {
        const operator = result[1];
        const subexpression2: GenericSearchOperationNode = result[3];
        const subexpression1Prime: AccumulatedOperation | null = result[4];

        if (subexpression1Prime === null) {
          return [operator, subexpression2] satisfies OperationChainEnd;
        }

        return [
          operator,
          subexpression2,
          subexpression1Prime,
        ] satisfies NestedAccumulatedOperation;
      }),
      ul.ε,
    );
  },
  subexpression2: (l) => {
    return P.seq(
      // -
      l.subexpression3,
      l.subexpression2Prime,
    ).map((result) => {
      const subexpression3: GenericSearchOperationNode = result[0];
      const subexpressionPrime: AccumulatedOperation | null = result[1];

      if (subexpressionPrime === null) {
        return subexpression3;
      }

      const expression = associateLeft([subexpression3, subexpressionPrime]);
      return expression;
    });
  },
  subexpression2Prime: (l) => {
    return P.alt<SearchLanguage['subexpression2Prime']>(
      P.seq(
        // -
        P.optWhitespace,
        P.string(Operator.Intersection),
        P.optWhitespace,
        l.subexpression3,
        l.subexpression2Prime,
      ).map((result) => {
        const operator = result[1];
        const subexpression3 = result[3];
        const subexpression2Prime = result[4];

        if (subexpression2Prime === null) {
          return [operator, subexpression3] satisfies OperationChainEnd;
        }

        return [
          operator,
          subexpression3,
          subexpression2Prime,
        ] satisfies NestedAccumulatedOperation;
      }),
      ul.ε,
    );
  },
  subexpression3: (l) => {
    return P.alt<SearchLanguage['subexpression3']>(
      // -
      P.seq(
        P.string('('),
        P.optWhitespace,
        l.subexpression1,
        P.optWhitespace,
        P.string(')'),
      ).map((result) => {
        return result[2];
      }),
      l.subexpression4,
    );
  },
  subexpression4: (l) => {
    return l.searchOperation;
  },
  searchOperation: (l) => {
    return P.alt<SearchLanguage['searchOperation']>(
      l.hasExactTagValuesOperation,
      l.hasAllTagValuesOperation,
      l.hasAnyTagValueOperation,
      l.hasTagNameOperation,
      l.selectAllOperation,
    );
  },
  hasExactTagValuesOperation: () => {
    return P.seq(
      // -
      tl.tagName,
      tl.delimiter,
      P.string('='),
      tl.tagValueUnit,
    ).map((result) => {
      const tagName = result[0];
      const tagValueList = result[3];
      return new HasExactTagValuesOperationNode(tagName, tagValueList);
    });
  },
  hasAllTagValuesOperation: () => {
    return P.seq(
      // -
      tl.tagName,
      tl.delimiter,
      P.string('^'),
      tl.tagValueUnit,
    ).map((result) => {
      const tagName = result[0];
      const tagValueList = result[3];
      return new HasAllTagValuesOperationNode(tagName, tagValueList);
    });
  },
  hasAnyTagValueOperation: () => {
    return P.seq(
      tl.tagName,
      tl.delimiter,
      P.alt<string[]>(
        P.seq(
          // -
          P.string('~'),
          tl.tagValueUnit,
        ).map((result) => {
          const tagValueList = result[1];
          return tagValueList;
        }),
        tl.tagValue.map((value) => {
          return [value];
        }),
      ),
    ).map((result) => {
      const tagName = result[0];
      const tagValueList = result[2];
      return new HasAnyTagValueOperationNode(tagName, tagValueList);
    });
  },
  hasTagNameOperation: () => {
    return tl.tagName.map((tagName) => {
      return new HasTagNameOperationNode(tagName);
    });
  },
  selectAllOperation: () => {
    return P.string('*').map(() => {
      return new SelectAllOperationNode();
    });
  },
});

export const parseSearch = (input: string) => {
  return searchLanguage.search.tryParse(input);
};
