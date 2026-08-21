/**
 * Lightweight, robust, zero-dependency test framework for TypeScript E2E testing
 */

export interface TestCase {
  name: string;
  fn: () => void | Promise<void>;
  tier: 1 | 2 | 3 | 4;
  featureIndex?: number;
  featureName?: string;
}

export interface TestResult {
  name: string;
  tier: 1 | 2 | 3 | 4;
  featureIndex?: number;
  featureName?: string;
  passed: boolean;
  error?: Error;
  durationMs: number;
}

export interface SuiteStats {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  tierStats: Record<number, { total: number; passed: number; failed: number }>;
}

export class TestRunner {
  private tests: TestCase[] = [];
  private currentTier: 1 | 2 | 3 | 4 = 1;
  private currentFeatureIndex?: number;
  private currentFeatureName?: string;

  public setContext(tier: 1 | 2 | 3 | 4, featureIndex?: number, featureName?: string) {
    this.currentTier = tier;
    this.currentFeatureIndex = featureIndex;
    this.currentFeatureName = featureName;
  }

  public test(name: string, fn: () => void | Promise<void>) {
    this.tests.push({
      name,
      fn,
      tier: this.currentTier,
      featureIndex: this.currentFeatureIndex,
      featureName: this.currentFeatureName,
    });
  }

  public async run(): Promise<{ results: TestResult[]; stats: SuiteStats }> {
    const results: TestResult[] = [];
    const startTime = Date.now();

    const tierStats: Record<number, { total: number; passed: number; failed: number }> = {
      1: { total: 0, passed: 0, failed: 0 },
      2: { total: 0, passed: 0, failed: 0 },
      3: { total: 0, passed: 0, failed: 0 },
      4: { total: 0, passed: 0, failed: 0 },
    };

    for (const t of this.tests) {
      const tStart = Date.now();
      let passed = true;
      let error: Error | undefined;

      try {
        await t.fn();
      } catch (err: unknown) {
        passed = false;
        error = err instanceof Error ? err : new Error(String(err));
      }

      const durationMs = Date.now() - tStart;
      const res: TestResult = {
        name: t.name,
        tier: t.tier,
        featureIndex: t.featureIndex,
        featureName: t.featureName,
        passed,
        error,
        durationMs,
      };
      results.push(res);

      tierStats[t.tier].total++;
      if (passed) {
        tierStats[t.tier].passed++;
      } else {
        tierStats[t.tier].failed++;
      }
    }

    const totalDuration = Date.now() - startTime;
    const passedCount = results.filter((r) => r.passed).length;
    const failedCount = results.filter((r) => !r.passed).length;

    return {
      results,
      stats: {
        total: results.length,
        passed: passedCount,
        failed: failedCount,
        durationMs: totalDuration,
        tierStats,
      },
    };
  }
}

function createMatchers<T>(actual: T, isNot = false) {
function describeThrown(value: unknown): string {
  return value instanceof Error ? value.message : String(value);
}

function getLength(value: unknown): number | undefined {
  if (typeof value === 'string' || Array.isArray(value)) {
    return value.length;
  }
  if (value !== null && typeof value === 'object' && 'length' in value) {
    const length = (value as { length?: unknown }).length;
    return typeof length === 'number' ? length : undefined;
  }
  return undefined;
}

  return {
    toBe(expected: unknown) {
      const condition = actual === expected;
      if (isNot ? condition : !condition) {
        throw new Error(
          isNot
            ? `Expected NOT ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
            : `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
        );
      }
    },
    toEqual(expected: unknown) {
      const a = JSON.stringify(actual);
      const e = JSON.stringify(expected);
      const condition = a === e;
      if (isNot ? condition : !condition) {
        throw new Error(
          isNot
            ? `Expected values NOT to be deeply equal: ${a}`
            : `Expected deep equality:\nExpected: ${e}\nReceived: ${a}`
        );
      }
    },
    toBeTruthy() {
      const condition = Boolean(actual);
      if (isNot ? condition : !condition) {
        throw new Error(
          isNot
            ? `Expected truthy value to NOT be truthy, received ${JSON.stringify(actual)}`
            : `Expected truthy value, received ${JSON.stringify(actual)}`
        );
      }
    },
    toBeFalsy() {
      const condition = !actual;
      if (isNot ? condition : !condition) {
        throw new Error(
          isNot
            ? `Expected falsy value to NOT be falsy, received ${JSON.stringify(actual)}`
            : `Expected falsy value, received ${JSON.stringify(actual)}`
        );
      }
    },
    toBeGreaterThan(expected: number) {
      const condition = typeof actual === 'number' && actual > expected;
      if (isNot ? condition : !condition) {
        throw new Error(
          isNot
            ? `Expected ${actual} NOT to be greater than ${expected}`
            : `Expected ${actual} to be greater than ${expected}`
        );
      }
    },
    toBeGreaterThanOrEqual(expected: number) {
      const condition = typeof actual === 'number' && actual >= expected;
      if (isNot ? condition : !condition) {
        throw new Error(
          isNot
            ? `Expected ${actual} NOT to be >= ${expected}`
            : `Expected ${actual} to be >= ${expected}`
        );
      }
    },
    toBeLessThan(expected: number) {
      const condition = typeof actual === 'number' && actual < expected;
      if (isNot ? condition : !condition) {
        throw new Error(
          isNot
            ? `Expected ${actual} NOT to be less than ${expected}`
            : `Expected ${actual} to be less than ${expected}`
        );
      }
    },
    toBeLessThanOrEqual(expected: number) {
      const condition = typeof actual === 'number' && actual <= expected;
      if (isNot ? condition : !condition) {
        throw new Error(
          isNot
            ? `Expected ${actual} NOT to be <= ${expected}`
            : `Expected ${actual} to be <= ${expected}`
        );
      }
    },
    toBeCloseTo(expected: number, delta = 0.01) {
      const condition = typeof actual === 'number' && Math.abs(actual - expected) <= delta;
      if (isNot ? condition : !condition) {
        throw new Error(
          isNot
            ? `Expected ${actual} NOT to be close to ${expected}`
            : `Expected ${actual} to be close to ${expected} (within ${delta})`
        );
      }
    },
    toContain(item: unknown) {
      let condition = false;
      if (Array.isArray(actual)) {
        condition = actual.includes(item);
      } else if (typeof actual === 'string') {
        condition = actual.includes(String(item));
      } else {
        throw new Error(`toContain called on non-collection: ${typeof actual}`);
      }
      if (isNot ? condition : !condition) {
        throw new Error(
          isNot
            ? `Expected collection NOT to contain ${JSON.stringify(item)}`
            : `Expected collection to contain ${JSON.stringify(item)}`
        );
      }
    },
    toMatch(regex: RegExp) {
      const condition = typeof actual === 'string' && regex.test(actual);
      if (isNot ? condition : !condition) {
        throw new Error(
          isNot
            ? `Expected "${actual}" NOT to match regex ${regex}`
            : `Expected "${actual}" to match regex ${regex}`
        );
      }
    },
    toThrow(expectedSubstring?: string) {
      if (typeof actual !== 'function') {
        throw new Error(`toThrow called on non-function`);
      }
      let threw = false;
      let thrownError: unknown;
      try {
        const callable = actual as () => unknown;
        callable();
      } catch (err: unknown) {
        threw = true;
        thrownError = err;
      }
      if (isNot) {
        if (threw) {
          throw new Error(`Expected function NOT to throw, but it threw: ${describeThrown(thrownError)}`);
        }
      } else {
        if (!threw) {
          throw new Error(`Expected function to throw an error, but it did not`);
        }
        if (expectedSubstring && thrownError !== undefined) {
          const msg = describeThrown(thrownError);
          if (!msg.includes(expectedSubstring)) {
            throw new Error(`Expected error message to contain "${expectedSubstring}", got "${msg}"`);
          }
        }
      }
    },
    toBeNull() {
      const condition = actual === null;
      if (isNot ? condition : !condition) {
        throw new Error(
          isNot ? `Expected value NOT to be null` : `Expected null, received ${JSON.stringify(actual)}`
        );
      }
    },
    toBeUndefined() {
      const condition = actual === undefined;
      if (isNot ? condition : !condition) {
        throw new Error(
          isNot ? `Expected value NOT to be undefined` : `Expected undefined, received ${JSON.stringify(actual)}`
        );
      }
    },
    toBeDefined() {
      const condition = actual !== undefined;
      if (isNot ? condition : !condition) {
        throw new Error(
          isNot ? `Expected value to be undefined` : `Expected defined value, received undefined`
        );
      }
    },
    toHaveLength(len: number) {
      const actualLength = getLength(actual);
      const condition = actualLength === len;
      if (isNot ? condition : !condition) {
        throw new Error(
          isNot
            ? `Expected length NOT to be ${len}`
            : `Expected length ${len}, received ${actualLength}`
        );
      }
    },
  };
}

export function expect<T>(actual: T) {
  const matchers = createMatchers(actual, false);
  const notMatchers = createMatchers(actual, true);
  return {
    ...matchers,
    not: notMatchers,
  };
}
