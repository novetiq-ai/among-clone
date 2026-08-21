/**
 * Automated in-process logic test runner for Nebula Deception.
 *
 * Validates game rules and state transitions; this is not browser or network E2E coverage.
 */

import { TestRunner } from '../tests/test-framework';
import { registerTier1Tests } from '../tests/e2e/tier1-features.test';
import { registerTier2Tests } from '../tests/e2e/tier2-boundaries.test';
import { registerTier3Tests } from '../tests/e2e/tier3-combinations.test';
import { registerTier4Tests } from '../tests/e2e/tier4-scenarios.test';

async function main() {
  console.log('\n================================================================================');
  console.log('🚀 NEBULA DECEPTION — AUTOMATED LOGIC TEST SUITE');
  console.log('   Harness: TypeScript / in-process game rules and state transitions');
  console.log('================================================================================\n');

  const runner = new TestRunner();

  console.log('📦 Loading Test Suites across Tiers 1 to 4...');
  registerTier1Tests(runner);
  registerTier2Tests(runner);
  registerTier3Tests(runner);
  registerTier4Tests(runner);

  console.log('⚡ Executing Test Suites...\n');
  const startTime = Date.now();
  const { results, stats } = await runner.run();
  const totalDuration = Date.now() - startTime;
  const passRate = stats.total === 0 ? 0 : (stats.passed / stats.total) * 100;

  // Print results
  console.log('--------------------------------------------------------------------------------');
  console.log('📊 EXECUTION SUMMARY BY TIER:');
  console.log('--------------------------------------------------------------------------------');

  const tierNames: Record<number, string> = {
    1: 'Tier 1: Feature Coverage (All 40 Features)',
    2: 'Tier 2: Boundary & Corner Cases (All 40 Features)',
    3: 'Tier 3: Pairwise Cross-Feature Interactions',
    4: 'Tier 4: Full-Lifecycle State Simulations',
  };

  for (let tier = 1; tier <= 4; tier++) {
    const tStats = stats.tierStats[tier];
    const status = tStats.failed === 0 ? '✅ PASS' : '❌ FAIL';
    console.log(
      `  [${status}] ${tierNames[tier].padEnd(50)} | Total: ${String(tStats.total).padStart(3)} | Passed: ${String(tStats.passed).padStart(3)} | Failed: ${String(tStats.failed).padStart(2)}`
    );
  }

  console.log('--------------------------------------------------------------------------------');
  console.log('🏁 TOTAL TEST SUITE METRICS:');
  console.log(`   Total Tests Executed : ${stats.total}`);
  console.log(`   Tests Passed         : ${stats.passed} (${passRate.toFixed(1)}%)`);
  console.log(`   Tests Failed         : ${stats.failed}`);
  console.log(`   Execution Time       : ${(totalDuration / 1000).toFixed(3)}s`);
  console.log('================================================================================\n');

  if (stats.failed > 0) {
    console.error('❌ FAILED TESTS DETAILS:');
    for (const r of results) {
      if (!r.passed) {
        console.error(`  - [Tier ${r.tier}] ${r.name}`);
        if (r.error) {
          console.error(`    Error: ${r.error.message}`);
        }
      }
    }
    process.exit(1);
  } else {
    console.log(`🎉 ALL ${stats.total} LOGIC TESTS PASSED (${passRate.toFixed(1)}%).\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
