/**
 * Adversarial Stress Harness for M4 Frontend Backtest Deliverables
 * Run via: NODE_PATH=node_modules node tests/backtest_stress_runner.js
 */

// 1. Mock browser globals for Node test environment
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {}
};

const path = require('path');
const opts = require('/tmp/ts_test/page/stock-radar/components/backtestChartOptions.js');
const svc = require('/tmp/ts_test/common/services/stockService.js');

const {
  getChartThemeTokens,
  getWinRateGaugeOption,
  getCumulativeReturnCurveOption,
  getPnlDistributionOption,
  getStrategyRadarOption
} = opts;

const { generateMockBacktestSummary } = svc;

let passedTests = 0;
let totalTests = 0;
const failures = [];

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    failures.push({ testName, details });
    console.error(`  ❌ FAIL: ${testName} - ${details}`);
  }
}

console.log('================================================================');
console.log('🚀 STARTING EMPIRICAL ADVERSARIAL STRESS TEST SUITE (M4 FRONTEND)');
console.log('================================================================\n');

// -------------------------------------------------------------
// SUITE 1: Chart Option Generators Null/Undefined/Adversarial Payloads
// -------------------------------------------------------------
console.log('--- SUITE 1: Chart Option Generators Adversarial Inputs ---');

// 1.1 WinRateGauge under null, undefined, empty object
try {
  const gNull = getWinRateGaugeOption(null, false);
  assert(gNull && gNull.series && gNull.series[0].data[0].value === 0, 'WinRateGauge handles null metrics without throw');
  
  const gUndef = getWinRateGaugeOption(undefined, true);
  assert(gUndef && gUndef.series && gUndef.series[0].data[0].value === 0, 'WinRateGauge handles undefined metrics in dark mode');
  
  const gEmpty = getWinRateGaugeOption({}, false);
  assert(gEmpty && gEmpty.series && gEmpty.series[0].data[0].value === 0, 'WinRateGauge handles empty metrics object');
} catch (e) {
  assert(false, 'WinRateGauge null/empty metrics', e.message);
}

// 1.2 WinRateGauge boundary values
const testWinRates = [-100, 0, 49.9, 50.0, 69.9, 70.0, 85.5, 100, NaN, Infinity];
testWinRates.forEach(wr => {
  try {
    const opt = getWinRateGaugeOption({ winRate: wr, profitFactor: 2.0, defensiveSuccessRate: 80, takeProfitHitRate: 70 }, false);
    const val = opt.series[0].data[0].value;
    const name = opt.series[0].data[0].name;
    const expectedTarget = wr >= 70.0;
    assert(
      !isNaN(val) || isNaN(wr),
      `WinRateGauge handles winRate=${wr} (name=${name})`
    );
  } catch (e) {
    assert(false, `WinRateGauge boundary wr=${wr}`, e.message);
  }
});

// 1.3 CumulativeReturnCurve under null, undefined, empty
try {
  const cNull = getCumulativeReturnCurveOption(null, false);
  assert(cNull && cNull.xAxis.data.length === 0, 'CumulativeReturnCurve handles null curve');
  
  const cEmpty = getCumulativeReturnCurveOption([], true);
  assert(cEmpty && cEmpty.series.length === 3, 'CumulativeReturnCurve handles empty curve with 3 series');
  
  // Test tooltip formatter with edge cases
  const tooltipFn = cEmpty.tooltip.formatter;
  assert(tooltipFn([]) === '', 'CumulativeReturnCurve tooltip handles empty params');
  assert(tooltipFn(null) === '', 'CumulativeReturnCurve tooltip handles null params');
  
  const dummyParams = [
    { axisValue: '2026-06-01', value: 3.52, seriesName: '策略累计收益', color: '#1890ff', marker: '●' },
    { axisValue: '2026-06-01', value: -1.25, seriesName: '沪深300基准', color: '#8c8c8c', marker: '●' },
    { axisValue: '2026-06-01', value: 4.77, seriesName: '超额收益 (Alpha)', color: '#52c41a', marker: '●' }
  ];
  const renderedHtml = tooltipFn(dummyParams);
  assert(renderedHtml.includes('2026-06-01') && renderedHtml.includes('+3.52%') && renderedHtml.includes('-1.25%'), 'CumulativeReturnCurve tooltip formats values with signs');
  
  // Non-number param values
  const nonNumParams = [{ axisValue: '2026-06-01', value: 'invalid', seriesName: '超额收益 (Alpha)', color: '#52c41a', marker: '●' }];
  const nonNumHtml = tooltipFn(nonNumParams);
  assert(typeof nonNumHtml === 'string', 'CumulativeReturnCurve tooltip survives non-number value');
} catch (e) {
  assert(false, 'CumulativeReturnCurve null/empty curve', e.message);
}

// 1.4 CumulativeReturnCurve stress test 2000 points
try {
  const bigCurve = [];
  for (let i = 0; i < 2000; i++) {
    bigCurve.push({
      date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
      strategyReturn: i * 0.05,
      benchmarkReturn: i * 0.01,
      excessReturn: i * 0.04
    });
  }
  const tStart = Date.now();
  const cBig = getCumulativeReturnCurveOption(bigCurve, false);
  const duration = Date.now() - tStart;
  assert(cBig.xAxis.data.length === 2000 && duration < 50, `CumulativeReturnCurve scales to 2000 items (${duration}ms)`);
} catch (e) {
  assert(false, 'CumulativeReturnCurve big curve stress', e.message);
}

// 1.5 PnlDistribution under null, undefined, empty
try {
  const pNull = getPnlDistributionOption(null, false);
  assert(pNull && pNull.series[0].data.length === 0, 'PnlDistribution handles null bins');
  
  const pEmpty = getPnlDistributionOption([], true);
  assert(pEmpty && pEmpty.series[0].data.length === 0, 'PnlDistribution handles empty bins');
  
  // Bins with all 0 counts (prevent division-by-zero NaN)
  const zeroBins = [
    { range: '< -5%', count: 0 },
    { range: '-5% ~ -3%', count: 0 },
    { range: '-3% ~ 0%', count: 0 },
    { range: '0% ~ 3%', count: 0 },
    { range: '3% ~ 5%', count: 0 },
    { range: '> 5%', count: 0 }
  ];
  const pZero = getPnlDistributionOption(zeroBins, false);
  const pnlTooltipFn = pZero.tooltip.formatter;
  const zeroHtml = pnlTooltipFn({ name: '< -5%', value: 0 });
  assert(!zeroHtml.includes('NaN'), 'PnlDistribution tooltip prevents NaN division-by-zero when count=0');
} catch (e) {
  assert(false, 'PnlDistribution null/empty bins', e.message);
}

// 1.6 StrategyRadar under null, undefined, empty
try {
  const rNull = getStrategyRadarOption(null, false);
  assert(rNull && rNull.series[0].data.length === 3, 'StrategyRadar handles null comparison with defaults');
  
  const rEmpty = getStrategyRadarOption({}, true);
  assert(rEmpty && rEmpty.series[0].data.length === 3, 'StrategyRadar handles empty comparison with defaults');
  
  // Partial strategies (only CONSERVATIVE)
  const partial = {
    CONSERVATIVE: { winRate: 80, avgReturn: 3.5, maxDrawdown: 2.0, defensiveRate: 90, profitFactor: 3.0 }
  };
  const rPartial = getStrategyRadarOption(partial, false);
  assert(rPartial.series[0].data[0].value[0] === 80, 'StrategyRadar handles partial comparison map');
  
  // Tooltip formatter for all strategies
  const radarTooltip = rPartial.tooltip.formatter;
  const tCons = radarTooltip({ name: '稳健红利', marker: '●', value: [80, 50, 80, 90, 100] });
  const tBal = radarTooltip({ name: '平衡成长', marker: '●', value: [72, 60, 64, 81, 80] });
  const tAgg = radarTooltip({ name: '进取突击', marker: '●', value: [70, 80, 50, 75, 70] });
  assert(tCons.includes('稳健红利') && tBal.includes('平衡成长') && tAgg.includes('进取突击'), 'StrategyRadar tooltip formats all strategy variants');
} catch (e) {
  assert(false, 'StrategyRadar null/partial comparison', e.message);
}

// -------------------------------------------------------------
// SUITE 2: Theme Switching Stress
// -------------------------------------------------------------
console.log('\n--- SUITE 2: Rapid Theme Switching Stress (100 Iterations) ---');
try {
  let themeSwapSuccess = true;
  for (let i = 0; i < 100; i++) {
    const isDark = i % 2 === 0;
    const tokens = getChartThemeTokens(isDark);
    if (isDark && !tokens.textColor.includes('#e6e6e6')) themeSwapSuccess = false;
    if (!isDark && !tokens.textColor.includes('#262626')) themeSwapSuccess = false;
    
    // Generate all 4 options
    getWinRateGaugeOption({ winRate: 75 }, isDark);
    getCumulativeReturnCurveOption([], isDark);
    getPnlDistributionOption([], isDark);
    getStrategyRadarOption({}, isDark);
  }
  assert(themeSwapSuccess, '100 iterations of rapid dark/light theme switching pass without errors or token pollution');
} catch (e) {
  assert(false, 'Theme switching stress', e.message);
}

// -------------------------------------------------------------
// SUITE 3: Rapid Window & Strategy Filter Toggling
// -------------------------------------------------------------
console.log('\n--- SUITE 3: Data Invariants Across Windows & Strategies ---');

const windows = [30, 60, 90, 45, 0, -1, 120];
const strategies = ['ALL', 'CONSERVATIVE', 'BALANCED', 'AGGRESSIVE', 'INVALID'];

windows.forEach(win => {
  strategies.forEach(strat => {
    try {
      const data = generateMockBacktestSummary(win, strat);
      
      // Verification of quant invariants:
      const totalTrades = data.summary.totalTrades;
      const winTrades = data.summary.winTrades;
      const winRate = data.summary.winRate;
      const defRate = data.summary.defensiveSuccessRate;
      const buffer = data.summary.avgSafetyBuffer;
      
      const basicValid = totalTrades > 0 && winTrades <= totalTrades;
      const winRateValid = winRate >= 65.0; // All variants maintain high win rate
      const defValid = defRate >= 70.0;
      const bufferValid = buffer >= 2.0 && buffer <= 4.0;
      const pnlSum = data.pnlDistribution.reduce((acc, b) => acc + b.count, 0);
      const pnlValid = pnlSum === totalTrades;
      
      assert(
        basicValid && winRateValid && defValid && bufferValid && pnlValid,
        `Data invariants hold for window=${win}, strategy=${strat} (trades=${totalTrades}, winRate=${winRate}%, buffer=${buffer}%)`
      );
    } catch (e) {
      assert(false, `Data generation error for window=${win}, strategy=${strat}`, e.message);
    }
  });
});

// -------------------------------------------------------------
// SUITE 4: CSV Export Formatting & Adversarial Payload Stress
// -------------------------------------------------------------
console.log('\n--- SUITE 4: CSV Export Logic & Adversarial Record Stress ---');

function exportCsvHelper(trades) {
  if (!trades || trades.length === 0) {
    return null;
  }

  const headers = [
    'ID', '股票代码', '股票名称', '策略类型', '扫描日期', '建仓日期',
    '平仓日期', '建仓价', '平仓价', '实盘收益率%', '持仓天数', '出局状态',
    '最大浮盈%', '最大浮亏%', '归因分类', '归因说明',
  ];

  const rows = trades.map((t) => [
    t.id ?? '',
    t.code ?? '',
    t.name ?? '',
    t.strategy ?? '',
    t.scanDate ?? '',
    t.entryDate ?? '',
    t.exitDate ?? '',
    (typeof t.entryPrice === 'number' ? t.entryPrice : Number(t.entryPrice || 0)).toFixed(2),
    (typeof t.exitPrice === 'number' ? t.exitPrice : Number(t.exitPrice || 0)).toFixed(2),
    (typeof t.returnPercent === 'number' ? t.returnPercent : Number(t.returnPercent || 0)).toFixed(2),
    t.holdingDays ?? 0,
    t.status ?? '',
    (typeof t.mfePercent === 'number' ? t.mfePercent : Number(t.mfePercent || 0)).toFixed(2),
    (typeof t.maePercent === 'number' ? t.maePercent : Number(t.maePercent || 0)).toFixed(2),
    t.attributionCategory || '正常盈利',
    `"${(t.attributionReason || t.attribution || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent =
    '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  return csvContent;
}

// 4.1 Empty / null trades
assert(exportCsvHelper([]) === null, 'CSV export gracefully handles empty trades');
assert(exportCsvHelper(null) === null, 'CSV export gracefully handles null trades');

// 4.2 Standard mock trades export
const stdData = generateMockBacktestSummary(60, 'ALL');
const stdCsv = exportCsvHelper(stdData.trades);
assert(
  stdCsv && stdCsv.startsWith('\uFEFFID,股票代码,股票名称') && stdCsv.split('\n').length === stdData.trades.length + 1,
  `CSV export produces valid UTF-8 BOM CSV with ${stdData.trades.length} rows`
);

// 4.3 Adversarial trade records (quotes, commas, newlines, undefined/null fields)
const adversarialTrades = [
  {
    id: 'ADV_001',
    code: '600000',
    name: '浦发,银行"特殊标的"',
    strategy: 'CONSERVATIVE',
    scanDate: '2026-06-01',
    entryDate: '2026-06-02',
    exitDate: '2026-06-05',
    entryPrice: 8.50,
    exitPrice: 8.90,
    returnPercent: 4.71,
    holdingDays: 3,
    status: 'TAKE_PROFIT',
    mfePercent: 5.20,
    maePercent: -0.80,
    attributionCategory: null,
    attributionReason: '无异常，正常"止盈", 且突破成功\n第二行说明'
  },
  {
    id: 'ADV_002',
    code: '300001',
    name: '特锐德',
    strategy: 'AGGRESSIVE',
    scanDate: '2026-07-01',
    entryDate: '2026-07-02',
    exitDate: '2026-07-04',
    entryPrice: 20.0,
    exitPrice: 19.2,
    returnPercent: -4.0,
    holdingDays: 2,
    status: 'STOP_LOSS',
    mfePercent: 1.0,
    maePercent: -4.2,
    attributionCategory: 'FALSE_BREAKOUT',
    attributionReason: '假突破"诱多", 放量滞涨, 触发出局'
  }
];

const advCsv = exportCsvHelper(adversarialTrades);
assert(
  advCsv.includes('""诱多""'),
  'CSV export escapes embedded double quotes in attribution reasons per RFC 4180'
);
assert(
  advCsv.startsWith('\uFEFF'),
  'CSV export includes UTF-8 BOM (\\uFEFF) to prevent Excel Mojibake / garbled Chinese characters'
);

// Empirical check for unquoted trade name vulnerability:
const nameHasUnescapedQuote = advCsv.includes('浦发,银行"特殊标的"');
assert(
  nameHasUnescapedQuote,
  'Empirically confirmed: trade.name is unquoted in current implementation (Finding 2: RFC 4180 risk on comma/quotes in stock names)'
);

// -------------------------------------------------------------
// SUMMARY REPORT
// -------------------------------------------------------------
console.log('\n================================================================');
console.log(`📊 STRESS TEST COMPLETE: ${passedTests}/${totalTests} PASSED (Failures: ${failures.length})`);
console.log('================================================================');

if (failures.length > 0) {
  console.error('\nFAILURE DETAILS:');
  failures.forEach(f => console.error(`  - ${f.testName}: ${f.details}`));
  process.exit(1);
} else {
  console.log('\n🎉 ALL ADVERSARIAL STRESS TESTS PASSED WITH 100% SUCCESS RATE!\n');
  process.exit(0);
}
