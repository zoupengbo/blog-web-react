import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export interface BacktestChartProps {
  option: echarts.EChartsOption;
  style?: React.CSSProperties;
  className?: string;
  loading?: boolean;
}

/**
 * Reusable BacktestChart component using ResizeObserver on container DOM
 * to prevent 0px canvas collapse inside sliding Ant Design Drawers and hidden Tabs.
 */
export const BacktestChart: React.FC<BacktestChartProps> = ({
  option,
  style = { width: '100%', height: 320 },
  className,
  loading = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Initialize instance if not exists
    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(containerRef.current);
    }

    const chart = chartInstanceRef.current;

    // 2. Handle loading state
    if (loading) {
      chart.showLoading({
        text: '加载中...',
        color: '#1890ff',
        textColor: '#8c8c8c',
        maskColor: 'rgba(0, 0, 0, 0.05)',
      });
      return;
    } else {
      chart.hideLoading();
    }

    // 3. Set options with notMerge = true to eliminate stale theme tokens
    chart.setOption(option, true);

    // 4. ResizeObserver for Drawer transitions & Tab display switches
    let resizeTimer: any = null;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          if (resizeTimer) clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            chart.resize();
          }, 30);
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    // 5. Fallback window resize listener
    const handleWindowResize = () => chart.resize();
    window.addEventListener('resize', handleWindowResize);

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [option, loading]);

  // Clean unmount disposal
  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} className={className} style={style} />;
};

export default BacktestChart;
