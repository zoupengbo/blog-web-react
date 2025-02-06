import React from 'react';
import { Chart } from './components/Chart';

const AccessManager: React.FC = () => {
    const currentYear = new Date().getFullYear(); // 获取当前年份

    // 创建一个包含年份和月份的数组，例如 2025-1, 2025-2, ..., 2025-12
    const months = Array.from({ length: 12 }, (_, i) => `${currentYear}-${i + 1}`);

    console.log("🚀 ~ months:", months)
    const option = {
        title: {
            text: `${currentYear}年销量数据`  // 动态显示当前年份
        },
        tooltip: {},
        xAxis: {
            data: months,  // 使用年份和月份的格式
            axisTick: {
                alignWithLabel: true  // 确保竖线在中间对齐
            },
        },
        yAxis: {},
        series: [{
            name: '销量',
            type: 'bar',
            data: [5, 20, 36, 10, 10, 20, 15, 25, 30, 40, 35, 50]  // 示例数据
        }]
    };

    return (
        <div>
            <Chart options={option} style={{ width: '1000px', height: '400px' }}></Chart>
        </div>
    );
};

export { AccessManager };
