import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface ChartProps {
  options: any;
  style?: React.CSSProperties;
}

const Chart: React.FC<ChartProps> = ({ options, style }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chartRef.current) {
      const chartInstance = echarts.init(chartRef.current);
      chartInstance.setOption(options);

      return () => {
        chartInstance.dispose();
      };
    }
  }, [options]);

  return <div ref={chartRef} style={{ width: '100%', height: '100%', ...style }}></div>;
};

export { Chart };
