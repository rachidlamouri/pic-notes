/**
 * @file
 * @note a comment with a single hyphen (// -) forces the formatter to break up
 * the subsequent statements into multiple lines
 */

import P from 'parsimmon';
import { TagNode } from './nodes/tagNode';
import { ExpressionNode } from './nodes/expressionNode';
import { IntersectionNode } from './nodes/intersectionNode';
import { isArray } from '../utils/assertIsArray';
import { ParsedNode } from './nodes/parsedNode';
import { UnionNode } from './nodes/unionNode';
import { DifferenceNode } from './nodes/differenceNode';
import { Constructor } from 'type-fest';
import { GenericOperationNode, OperationNode } from './nodes/operationNode';
import { SelectAllNode } from './nodes/selectAllNode';
import { KEBAB } from './tagParser';
import { withIndentDebug } from './parserUtils';

enum Operator {
  Intersection = '^',
  Union = '+',
  Difference = '-',
}

type OperationChainEnd = [Operator, ExpressionNode];

type NestedAccumulatedOperation = [Operator, ExpressionNode, unknown];

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
    datum[1] instanceof ParsedNode
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
  Constructor<GenericOperationNode>
> = {
  [Operator.Intersection]: IntersectionNode,
  [Operator.Union]: UnionNode,
  [Operator.Difference]: DifferenceNode,
};

const associateLeft = ([leftExpression, accumulatedOperation]: [
  ExpressionNode,
  AccumulatedOperation,
]): ExpressionNode => {
  const operator = accumulatedOperation[0];
  const Operation = operationConstructorByOperator[operator];

  const rightExpression: ExpressionNode = accumulatedOperation[1];

  let expression: ExpressionNode;
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
  expression: ExpressionNode;
  subexpression1: ExpressionNode;
  subexpression1Prime: AccumulatedOperation | null;
  subexpression2: ExpressionNode;
  subexpression2Prime: AccumulatedOperation | null;
  subexpression3: ExpressionNode;
  subexpression4: SelectAllNode | TagNode;
  unit: SelectAllNode | TagNode;
  selectAll: SelectAllNode;
  taggedValue: TagNode;
  tag: TagNode;
  value: string;
  kebab: string;
  ε: null;
};

const language = P.createLanguage<SearchLanguage>({
  expression: (l) => {
    return withIndentDebug<SearchLanguage['expression']>(
      'exp',
      P.seq(
        // -
        P.optWhitespace,
        l.subexpression1,
        P.optWhitespace,
      ).map((result) => {
        const expression = result[1];
        return expression;
      }),
    );
  },
  subexpression1: (l) => {
    return withIndentDebug<SearchLanguage['subexpression1']>(
      'exp1',
      P.seq(
        // -
        l.subexpression2,
        l.subexpression1Prime,
      ).map((result) => {
        const subexpression2: ExpressionNode = result[0];
        const subexpression1Prime: AccumulatedOperation | null = result[1];

        if (subexpression1Prime === null) {
          return subexpression2;
        }

        const expression = associateLeft([subexpression2, subexpression1Prime]);
        return expression;
      }),
    );
  },
  subexpression1Prime: (l) => {
    return withIndentDebug(
      "exp1'",
      P.alt<SearchLanguage['subexpression1Prime']>(
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
          const subexpression2: ExpressionNode = result[3];
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
        l.ε,
      ),
    );
  },
  subexpression2: (l) => {
    return withIndentDebug<SearchLanguage['subexpression2']>(
      'exp3',
      P.seq(
        // -
        l.subexpression3,
        l.subexpression2Prime,
      ).map((result) => {
        const subexpression3: ExpressionNode = result[0];
        const subexpressionPrime: AccumulatedOperation | null = result[1];

        if (subexpressionPrime === null) {
          return subexpression3;
        }

        const expression = associateLeft([subexpression3, subexpressionPrime]);
        return expression;
      }),
    );
  },
  subexpression2Prime: (l) => {
    return withIndentDebug(
      "exp3'",
      P.alt<SearchLanguage['subexpression2Prime']>(
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
        l.ε,
      ),
    );
  },
  subexpression3: (l) => {
    return withIndentDebug(
      'exp4',
      P.alt<SearchLanguage['subexpression3']>(
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
      ),
    );
  },
  subexpression4: (l) => {
    return withIndentDebug<SearchLanguage['subexpression4']>(
      // -
      'exp5',
      l.unit,
    );
  },
  unit: (l) => {
    return withIndentDebug(
      'unt',
      P.alt<SearchLanguage['unit']>(
        // -
        l.selectAll,
        l.taggedValue,
        l.tag,
      ),
    );
  },
  selectAll: (l) => {
    return withIndentDebug<SearchLanguage['selectAll']>(
      'all',
      P.string('*').map(() => {
        return new SelectAllNode();
      }),
    );
  },
  taggedValue: (l) => {
    return withIndentDebug<SearchLanguage['taggedValue']>(
      'tv',
      P.seq(
        // -
        l.tag,
        P.string(':'),
        l.value,
      ).map((result) => {
        const tagName = result[0].tag.name;
        const tagValue = result[2];
        return new TagNode(tagName, tagValue);
      }),
    );
  },
  tag: (l) => {
    return withIndentDebug<SearchLanguage['tag']>(
      // -
      'tag',
      l.kebab.map((tagName) => {
        return new TagNode(tagName);
      }),
    );
  },
  value: (l) => {
    return withIndentDebug<SearchLanguage['value']>(
      // -
      'val',
      l.kebab,
    );
  },
  kebab: () => {
    return P.regex(KEBAB);
  },
  ε: () => {
    return P.string('').result(null);
  },
});

export const parseSearch = (input: string) => {
  return language.expression.tryParse(input);
};
