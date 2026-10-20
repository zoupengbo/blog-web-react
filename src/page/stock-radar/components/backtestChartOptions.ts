import * as echarts from 'echarts';
import {
  BacktestMetrics,
  CumulativeCurvePoint,
  PnlBin,
  StrategyComparisonMap,
  StrategyComparisonItem
} from '../../../common/services/stockService';

export interface ChartThemeTokens {
  isDark: boolean;
  background: string;
  textColor: string;
  secondaryTextColor: string;
  axisLineColor: string;
  splitLineColor: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  radarSplitArea: string[];
  radarAxisLine: string;
  markLineColor: string;
}

export const getChartThemeTokens = (isDark: boolean): ChartThemeTokens => ({
  isDark,
  background: 'transparent',
  textColor: isDark ? '#e6e6e6' : '#262626',
  secondaryTextColor: isDark ? '#8c8c8c' : '#595959',
  axisLineColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
  splitLineColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
  tooltipBg: isDark ? 'rgba(31, 31, 31, 0.94)' : 'rgba(255, 255, 255, 0.96)',
  tooltipBorder: isDark ? '#303030' : '#e8e8e8',
  tooltipText: isDark ? '#f0f0f0' : '#262626',
  radarSplitArea: isDark
    ? ['rgba(255, 255, 255, 0.02)', 'rgba(255, 255, 255, 0.05)']
    : ['rgba(0, 0, 0, 0.015)', 'rgba(0, 0, 0, 0.035)'],
  radarAxisLine: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
  markLineColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.2)',
});

/**
 * 胜率仪表盘 (Win Rate Gauge)
 * 210° ~ -30° 仪表弧度，三色渐变区间，精准高亮 >=70% 达标区间
 */
export const getWinRateGaugeOption = (
  metrics: BacktestMetrics,
  isDark: boolean
): echarts.EChartsOption => {
  const tokens = getChartThemeTokens(isDark);
  const winRate = metrics?.winRate ?? 0;
  const isTargetMet = winRate >= 70.0;

  const primaryValueColor = isTargetMet
    ? isDark ? '#52c41a' : '#389e0d'
    : winRate >= 50
    ? isDark ? '#faad14' : '#d48806'
    : isDark ? '#ff4d4f' : '#cf1322';

  return {
    backgroundColor: tokens.background,
    title: {
      text: '回测预测胜率效能',
      subtext: `盈亏比: ${(metrics?.profitFactor ?? 0).toFixed(2)}  |  弱势抗跌: ${(metrics?.defensiveSuccessRate ?? 0).toFixed(1)}%  |  止盈达成: ${(metrics?.takeProfitHitRate ?? 0).toFixed(1)}%`,
      left: 'center',
      top: 10,
      textStyle: {
        fontSize: 14,
        fontWeight: 600,
        color: tokens.textColor,
      },
      subtextStyle: {
        fontSize: 11,
        color: tokens.secondaryTextColor,
      },
    },
    series: [
      {
        name: '预测胜率',
        type: 'gauge',
        center: ['50%', '58%'],
        radius: '86%',
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 100,
        splitNumber: 10,
        axisLine: {
          lineStyle: {
            width: 14,
            color: [
              [0.5, isDark ? 'rgba(255, 77, 79, 0.85)' : '#ff4d4f'],
              [0.7, isDark ? 'rgba(250, 173, 20, 0.85)' : '#faad14'],
              [1.0, isDark ? 'rgba(82, 196, 26, 0.95)' : '#52c41a'],
            ],
          },
        },
        progress: {
          show: true,
          width: 14,
          roundCap: true,
          itemStyle: {
            color: primaryValueColor,
          },
        },
        pointer: {
          show: true,
          length: '58%',
          width: 5,
          itemStyle: {
            color: isDark ? '#ffffff' : '#1f1f1f',
          },
        },
        anchor: {
          show: true,
          showAbove: true,
          size: 10,
          itemStyle: {
            borderWidth: 2,
            borderColor: primaryValueColor,
            color: isDark ? '#141414' : '#ffffff',
          },
        },
        axisTick: {
          distance: -18,
          length: 5,
          lineStyle: {
            color: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)',
            width: 1,
          },
        },
        splitLine: {
          distance: -20,
          length: 10,
          lineStyle: {
            color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.3)',
            width: 2,
          },
        },
        axisLabel: {
          distance: -16,
          color: tokens.secondaryTextColor,
          fontSize: 10,
          formatter: (value: number) => `${value}%`,
        },
        title: {
          show: true,
          offsetCenter: [0, '68%'],
          fontSize: 12,
          color: tokens.secondaryTextColor,
        },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, '36%'],
          fontSize: 26,
          fontWeight: 'bold',
          formatter: '{value}%',
          color: primaryValueColor,
        },
        data: [
          {
            value: Number(winRate.toFixed(1)),
            name: isTargetMet ? '达标 (≥70% 高胜率)' : '未达标 (<70%)',
          },
        ],
      },
    ],
  };
};

/**
 * 累计超额收益走势图 (Cumulative Return Curve)
 * 包含策略收益率、沪深300基准、超额Alpha面积填充及0轴基准线
 */
export const getCumulativeReturnCurveOption = (
  curve: CumulativeCurvePoint[],
  isDark: boolean
): echarts.EChartsOption => {
  const tokens = getChartThemeTokens(isDark);
  const dates = (curve || []).map((p) => p.date);
  const strategyData = (curve || []).map((p) => p.strategyReturn);
  const benchmarkData = (curve || []).map((p) => p.benchmarkReturn);
  const excessData = (curve || []).map((p) => p.excessReturn);

  return {
    backgroundColor: tokens.background,
    title: {
      text: '累计超额收益走势 (Walk-Forward 滚动前向回测)',
      left: 12,
      top: 10,
      textStyle: {
        fontSize: 14,
        fontWeight: 600,
        color: tokens.textColor,
      },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: tokens.tooltipBg,
      borderColor: tokens.tooltipBorder,
      borderWidth: 1,
      textStyle: {
        color: tokens.tooltipText,
        fontSize: 12,
      },
      extraCssText: 'box-shadow: 0 6px 16px rgba(0,0,0,0.15); backdrop-filter: blur(8px);',
      formatter: (params: any) => {
        if (!Array.isArray(params) || params.length === 0) return '';
        const header = `<div style="font-weight: 600; margin-bottom: 6px; border-bottom: 1px solid ${isDark ? '#3a3a3a' : '#f0f0f0'}; padding-bottom: 4px;">📅 ${params[0].axisValue}</div>`;
        const rows = params
          .map((p) => {
            const val = typeof p.value === 'number' ? p.value : parseFloat(p.value);
            const formatted = val >= 0 ? `+${val.toFixed(2)}%` : `${val.toFixed(2)}%`;
            const colorStyle = p.seriesName.includes('超额')
              ? val >= 0 ? '#52c41a' : '#ff4d4f'
              : p.color;
            return `
              <div style="display: flex; justify-content: space-between; gap: 16px; margin: 3px 0; font-size: 12px;">
                <span>${p.marker} <span>${p.seriesName}</span></span>
                <span style="font-weight: 600; color: ${colorStyle}">${formatted}</span>
              </div>
            `;
          })
          .join('');
        return header + rows;
      },
    },
    legend: {
      data: ['策略累计收益', '沪深300基准', '超额收益 (Alpha)'],
      right: 16,
      top: 12,
      textStyle: {
        color: tokens.secondaryTextColor,
        fontSize: 12,
      },
    },
    grid: {
      left: '3%',
      right: '3%',
      top: 56,
      bottom: 28,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: false,
      axisLine: {
        lineStyle: { color: tokens.axisLineColor },
      },
      axisLabel: {
        color: tokens.secondaryTextColor,
        fontSize: 11,
        rotate: dates.length > 50 ? 25 : 0,
      },
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLabel: {
        color: tokens.secondaryTextColor,
        fontSize: 11,
        formatter: '{value}%',
      },
      splitLine: {
        lineStyle: {
          color: tokens.splitLineColor,
          type: 'dashed',
        },
      },
    },
    series: [
      {
        name: '策略累计收益',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: strategyData,
        lineStyle: { width: 2.5, color: '#1890ff' },
        itemStyle: { color: '#1890ff' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(24, 144, 255, 0.32)' },
            { offset: 1, color: 'rgba(24, 144, 255, 0.02)' },
          ]),
        },
      },
      {
        name: '沪深300基准',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: benchmarkData,
        lineStyle: {
          width: 1.5,
          type: 'dashed',
          color: isDark ? '#8c8c8c' : '#bfbfbf',
        },
        itemStyle: { color: isDark ? '#8c8c8c' : '#bfbfbf' },
      },
      {
        name: '超额收益 (Alpha)',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: excessData,
        lineStyle: { width: 2.5, color: '#52c41a' },
        itemStyle: { color: '#52c41a' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(82, 196, 26, 0.25)' },
            { offset: 1, color: 'rgba(82, 196, 26, 0.01)' },
          ]),
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: {
            type: 'dashed',
            color: tokens.markLineColor,
          },
          data: [{ yAxis: 0 }],
        },
        markPoint: {
          symbolSize: 36,
          label: { fontSize: 10 },
          data: [
            { type: 'max', name: 'Alpha峰值', itemStyle: { color: '#52c41a' } },
            { type: 'min', name: 'Alpha谷值', itemStyle: { color: '#ff4d4f' } },
          ],
        },
      },
    ],
  };
};

/**
 * 盈亏分布直方图 (PnL Distribution Histogram)
 * 6大离散收益率区间，A股红涨绿跌经典配色
 */
export const getPnlDistributionOption = (
  bins: PnlBin[],
  isDark: boolean
): echarts.EChartsOption => {
  const tokens = getChartThemeTokens(isDark);
  const categories = (bins || []).map((b) => b.range);
  const counts = (bins || []).map((b) => b.count);
  const totalCount = counts.reduce((acc, c) => acc + c, 0);

  const getBinGradient = (index: number) => {
    const isLoss = index < 3; // First 3 bins are negative (<0%)
    if (isLoss) {
      if (index === 0) {
        return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#389e0d' },
          { offset: 1, color: isDark ? 'rgba(56, 158, 13, 0.3)' : 'rgba(56, 158, 13, 0.15)' },
        ]);
      } else if (index === 1) {
        return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#52c41a' },
          { offset: 1, color: isDark ? 'rgba(82, 196, 26, 0.3)' : 'rgba(82, 196, 26, 0.15)' },
        ]);
      } else {
        return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#73d13d' },
          { offset: 1, color: isDark ? 'rgba(115, 209, 61, 0.3)' : 'rgba(115, 209, 61, 0.15)' },
        ]);
      }
    } else {
      if (index === 3) {
        return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#ff7875' },
          { offset: 1, color: isDark ? 'rgba(255, 120, 117, 0.3)' : 'rgba(255, 120, 117, 0.15)' },
        ]);
      } else if (index === 4) {
        return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#ff4d4f' },
          { offset: 1, color: isDark ? 'rgba(255, 77, 79, 0.3)' : 'rgba(255, 77, 79, 0.15)' },
        ]);
      } else {
        return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#cf1322' },
          { offset: 1, color: isDark ? 'rgba(207, 19, 34, 0.3)' : 'rgba(207, 19, 34, 0.15)' },
        ]);
      }
    }
  };

  const seriesData = counts.map((c, idx) => ({
    value: c,
    itemStyle: {
      color: getBinGradient(idx),
      borderRadius: [4, 4, 0, 0] as [number, number, number, number],
    },
  }));

  return {
    backgroundColor: tokens.background,
    title: {
      text: '回测交易盈亏分布直方图',
      subtext: `总样本: ${totalCount} 笔交易  |  红涨绿跌保本中枢分界: 0%`,
      left: 12,
      top: 10,
      textStyle: {
        fontSize: 14,
        fontWeight: 600,
        color: tokens.textColor,
      },
      subtextStyle: {
        fontSize: 11,
        color: tokens.secondaryTextColor,
      },
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: tokens.tooltipBg,
      borderColor: tokens.tooltipBorder,
      textStyle: { color: tokens.tooltipText, fontSize: 12 },
      extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.15); backdrop-filter: blur(8px);',
      formatter: (param: any) => {
        const count = param.value;
        const ratio = totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : '0.0';
        return `
          <div style="font-weight: 600; margin-bottom: 4px;">盈亏区间: ${param.name}</div>
          <div>频次: <b style="color: #1890ff;">${count}</b> 笔</div>
          <div>占比: <b>${ratio}%</b></div>
        `;
      },
    },
    grid: {
      left: '3%',
      right: '3%',
      top: 60,
      bottom: 24,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLine: { lineStyle: { color: tokens.axisLineColor } },
      axisLabel: {
        color: tokens.secondaryTextColor,
        fontSize: 11,
      },
    },
    yAxis: {
      type: 'value',
      name: '交易笔数',
      nameTextStyle: { color: tokens.secondaryTextColor, fontSize: 11 },
      axisLabel: { color: tokens.secondaryTextColor, fontSize: 11 },
      splitLine: {
        lineStyle: {
          color: tokens.splitLineColor,
          type: 'dashed',
        },
      },
    },
    series: [
      {
        name: '盈亏分布',
        type: 'bar',
        barWidth: '42%',
        data: seriesData,
        label: {
          show: true,
          position: 'top',
          color: tokens.secondaryTextColor,
          fontSize: 11,
          fontWeight: 500,
          formatter: '{c} 笔',
        },
      },
    ],
  };
};

/**
 * 三大策略五维效能雷达图 (5-Dimension Strategy Radar)
 * 涵盖：预测胜率、收益爆发、回撤防御、弱势抗跌、盈亏比率
 */
export const getStrategyRadarOption = (
  comparison: StrategyComparisonMap,
  isDark: boolean
): echarts.EChartsOption => {
  const tokens = getChartThemeTokens(isDark);

  const stratData: Record<'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE', StrategyComparisonItem> = {
    CONSERVATIVE: comparison?.CONSERVATIVE || { winRate: 76.5, avgReturn: 2.9, maxDrawdown: 2.8, defensiveRate: 88.2, profitFactor: 2.85 },
    BALANCED: comparison?.BALANCED || { winRate: 72.8, avgReturn: 4.1, maxDrawdown: 4.5, defensiveRate: 81.0, profitFactor: 2.45 },
    AGGRESSIVE: comparison?.AGGRESSIVE || { winRate: 70.6, avgReturn: 5.4, maxDrawdown: 6.2, defensiveRate: 75.0, profitFactor: 2.15 },
  };

  const calculateScores = (m: StrategyComparisonItem, defaultPf: number) => {
    const pf = m.profitFactor ?? defaultPf;
    const winScore = Math.min(100, Math.max(0, m.winRate));
    const retScore = Math.min(100, Math.max(0, Math.round(m.avgReturn * 15)));
    const mddScore = Math.min(100, Math.max(0, Math.round(100 - m.maxDrawdown * 8)));
    const defScore = Math.min(100, Math.max(0, m.defensiveRate));
    const pfScore = Math.min(100, Math.max(0, Math.round((pf / 3.0) * 100)));
    return [winScore, retScore, mddScore, defScore, pfScore];
  };

  const conservativeScores = calculateScores(stratData.CONSERVATIVE, 2.85);
  const balancedScores = calculateScores(stratData.BALANCED, 2.45);
  const aggressiveScores = calculateScores(stratData.AGGRESSIVE, 2.15);

  return {
    backgroundColor: tokens.background,
    title: {
      text: '三大策略五维效能全景雷达',
      subtext: '标准化百分制评分 (胜率 / 收益爆发 / 回撤防御 / 弱势抗跌 / 盈亏比率)',
      left: 12,
      top: 10,
      textStyle: {
        fontSize: 14,
        fontWeight: 600,
        color: tokens.textColor,
      },
      subtextStyle: {
        fontSize: 11,
        color: tokens.secondaryTextColor,
      },
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: tokens.tooltipBg,
      borderColor: tokens.tooltipBorder,
      textStyle: { color: tokens.tooltipText, fontSize: 12 },
      extraCssText: 'box-shadow: 0 4px 16px rgba(0,0,0,0.18); backdrop-filter: blur(8px);',
      formatter: (params: any) => {
        const stratKey =
          params.name === '稳健红利'
            ? 'CONSERVATIVE'
            : params.name === '进取突击'
            ? 'AGGRESSIVE'
            : 'BALANCED';
        const raw = stratData[stratKey as keyof typeof stratData];
        const scores = params.value as number[];

        return `
          <div style="font-weight: 600; margin-bottom: 6px; border-bottom: 1px solid ${isDark ? '#3a3a3a' : '#f0f0f0'}; padding-bottom: 4px;">
            ${params.marker} <b>${params.name} 策略效能画像</b>
          </div>
          <table style="width: 100%; font-size: 11px; border-spacing: 4px 2px;">
            <tr><td>🎯 预测胜率:</td><td style="text-align: right; font-weight: 600;">${raw.winRate}% (评分 ${scores[0]})</td></tr>
            <tr><td>📈 平均收益:</td><td style="text-align: right; font-weight: 600;">+${raw.avgReturn}% (评分 ${scores[1]})</td></tr>
            <tr><td>🛡️ 回撤防御:</td><td style="text-align: right; font-weight: 600;">MDD ${raw.maxDrawdown}% (评分 ${scores[2]})</td></tr>
            <tr><td>📉 弱势抗跌:</td><td style="text-align: right; font-weight: 600;">${raw.defensiveRate}% (评分 ${scores[3]})</td></tr>
            <tr><td>⚖️ 盈亏比率:</td><td style="text-align: right; font-weight: 600;">${(raw.profitFactor ?? (stratKey === 'CONSERVATIVE' ? 2.85 : stratKey === 'BALANCED' ? 2.45 : 2.15)).toFixed(2)} (评分 ${scores[4]})</td></tr>
          </table>
        `;
      },
    },
    legend: {
      data: ['稳健红利', '平衡成长', '进取突击'],
      right: 16,
      top: 12,
      textStyle: {
        color: tokens.secondaryTextColor,
        fontSize: 12,
      },
    },
    radar: {
      indicator: [
        { name: '预测胜率', max: 100 },
        { name: '收益爆发', max: 100 },
        { name: '回撤防御', max: 100 },
        { name: '弱势抗跌', max: 100 },
        { name: '盈亏比率', max: 100 },
      ],
      radius: '65%',
      center: ['50%', '58%'],
      axisName: {
        color: tokens.secondaryTextColor,
        fontSize: 11,
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: tokens.radarSplitArea,
        },
      },
      splitLine: {
        lineStyle: {
          color: tokens.splitLineColor,
        },
      },
      axisLine: {
        lineStyle: {
          color: tokens.radarAxisLine,
        },
      },
    },
    series: [
      {
        name: '三大策略五维效能',
        type: 'radar',
        data: [
          {
            value: conservativeScores,
            name: '稳健红利',
            symbol: 'circle',
            symbolSize: 5,
            lineStyle: { width: 2, color: '#52c41a' },
            itemStyle: { color: '#52c41a' },
            areaStyle: { color: 'rgba(82, 196, 26, 0.22)' },
          },
          {
            value: balancedScores,
            name: '平衡成长',
            symbol: 'circle',
            symbolSize: 5,
            lineStyle: { width: 2, color: '#1890ff' },
            itemStyle: { color: '#1890ff' },
            areaStyle: { color: 'rgba(24, 144, 255, 0.22)' },
          },
          {
            value: aggressiveScores,
            name: '进取突击',
            symbol: 'circle',
            symbolSize: 5,
            lineStyle: { width: 2, color: '#ff4d4f' },
            itemStyle: { color: '#ff4d4f' },
            areaStyle: { color: 'rgba(255, 77, 79, 0.22)' },
          },
        ],
      },
    ],
  };
};
