import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { CharacterRelationship, PaperTheme } from '../types';
import { isPastCharacter } from '../utils/volumeParser';

interface RelationshipGraphProps {
  relationships: CharacterRelationship[];
  protagonistName: string;
  activeRelNode: CharacterRelationship | null;
  onSelectNode: (node: CharacterRelationship) => void;
  paperTheme?: PaperTheme;
}

export const RelationshipGraph: React.FC<RelationshipGraphProps> = ({
  relationships,
  protagonistName,
  activeRelNode,
  onSelectNode,
  paperTheme = 'dark',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(containerRef.current);
    }

    const chart = chartInstanceRef.current;

    // 构建节点数据
    const protagonistNode = {
      id: '__protagonist__',
      name: protagonistName || '主角',
      symbolSize: 66,
      itemStyle: {
        color: new echarts.graphic.RadialGradient(0.5, 0.5, 0.5, [
          { offset: 0, color: '#f59e0b' },
          { offset: 1, color: '#b45309' },
        ]),
        borderColor: '#ffd666',
        borderWidth: 2.5,
        shadowBlur: 14,
        shadowColor: 'rgba(245, 158, 11, 0.45)',
      },
      label: {
        show: true,
        formatter: `主角\n${protagonistName || '本尊'}`,
        color: '#ffffff',
        fontWeight: 'bold' as const,
        fontSize: 12,
        lineHeight: 16,
      },
      category: 0,
      isProtagonist: true,
    };

    const characterNodes = relationships.map((rel) => {
      const isPast = isPastCharacter(rel);
      const isSelected = activeRelNode?.name === rel.name;

      return {
        id: rel.name,
        name: rel.name,
        symbolSize: isSelected ? 46 : 38,
        itemStyle: {
          color: isPast ? '#18181f' : isSelected ? '#332912' : '#22222d',
          borderColor: isPast
            ? isSelected
              ? '#ffd666'
              : '#3f3f46'
            : isSelected
            ? '#ffd666'
            : '#d4b106',
          borderWidth: isSelected ? 2.5 : 1.5,
          borderType: (isPast ? 'dashed' : 'solid') as 'dashed' | 'solid',
          shadowBlur: isSelected ? 12 : 0,
          shadowColor: 'rgba(255, 214, 102, 0.4)',
        },
        label: {
          show: true,
          formatter: rel.name.length > 5 ? `${rel.name.slice(0, 4)}..` : rel.name,
          color: isPast ? '#71717a' : isSelected ? '#ffd666' : '#e4e4e7',
          fontSize: 11,
          fontWeight: isSelected ? ('bold' as const) : ('normal' as const),
        },
        value: rel.relationship,
        data: rel,
        isPast,
      };
    });

    const nodes = [protagonistNode, ...characterNodes];

    // 构建连线数据
    const links = relationships.map((rel) => {
      const isPast = isPastCharacter(rel);
      const isSelected = activeRelNode?.name === rel.name;

      return {
        source: '__protagonist__',
        target: rel.name,
        value: rel.relationship,
        lineStyle: {
          color: isPast ? '#3f3f46' : isSelected ? '#ffd666' : '#52525e',
          width: isSelected ? 2.5 : 1.2,
          type: (isPast ? 'dashed' : 'solid') as 'dashed' | 'solid',
          opacity: isPast ? 0.45 : isSelected ? 1 : 0.75,
          curveness: 0.04,
        },
        label: {
          show: isSelected, // 仅在选中时沿边显示标签，避免全局重叠混杂
          formatter: '{c}',
          color: '#ffd666',
          fontSize: 10,
          backgroundColor: 'rgba(24, 24, 32, 0.88)',
          borderColor: '#d4b106',
          borderWidth: 1,
          borderRadius: 4,
          padding: [2, 6],
        },
      };
    });

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(18, 18, 24, 0.95)',
        borderColor: '#d4b106',
        borderWidth: 1,
        textStyle: { color: '#ffffff', fontSize: 12 },
        confine: true,
        formatter: (params: any) => {
          if (params.dataType === 'edge') {
            return `<div style="font-size: 11px; padding: 2px;">与主角关系：<b style="color: #ffd666;">${params.value || '未知'}</b></div>`;
          }
          if (params.data?.isProtagonist) {
            return `<div style="padding: 2px;">🌟 <b>主角：${protagonistName}</b></div>`;
          }
          const data: CharacterRelationship = params.data?.data;
          if (!data) return '';
          const isPast = isPastCharacter(data);
          const chaps = data.appearanceChapters?.length
            ? data.appearanceChapters.join(', ')
            : '无';

          return `
            <div style="padding: 3px 6px; max-width: 260px; line-height: 1.5;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; gap: 8px;">
                <span style="font-size: 13px; font-weight: bold; color: ${isPast ? '#9ca3af' : '#ffd666'};">
                  ${data.name}
                </span>
                ${isPast ? '<span style="font-size: 10px; color: #ef4444; border: 1px solid #ef4444; border-radius: 3px; padding: 0 4px;">已退场</span>' : '<span style="font-size: 10px; color: #22c55e; border: 1px solid #22c55e; border-radius: 3px; padding: 0 4px;">活跃</span>'}
              </div>
              <div style="font-size: 11px; color: #e2e8f0;">关系：<span style="color: #faad14;">${data.relationship}</span></div>
              ${data.description ? `<div style="font-size: 11px; color: #94a3b8; margin-top: 4px; white-space: normal;">${data.description.length > 70 ? data.description.slice(0, 70) + '...' : data.description}</div>` : ''}
              <div style="font-size: 10px; color: #64748b; margin-top: 4px;">登场章节：第 ${chaps} 章</div>
            </div>
          `;
        },
      },
      series: [
        {
          type: 'graph',
          layout: 'force',
          roam: true,
          draggable: true,
          zoom: 1,
          scaleLimit: { min: 0.4, max: 3.5 },
          force: {
            repulsion: 380,
            gravity: 0.08,
            edgeLength: [120, 200],
            friction: 0.65,
          },
          nodes,
          links: links as any,
          emphasis: {
            focus: 'adjacency',
            lineStyle: {
              width: 3,
              color: '#ffd666',
              opacity: 1,
            },
            itemStyle: {
              borderColor: '#ffd666',
              borderWidth: 3,
              shadowBlur: 16,
              shadowColor: '#ffd666',
            },
          },
        },
      ],
    };

    chart.setOption(option, true);

    const handleClick = (params: any) => {
      if (params.dataType === 'node' && params.data?.data) {
        onSelectNode(params.data.data);
      }
    };

    chart.off('click');
    chart.on('click', handleClick);

    const handleResize = () => {
      chart.resize();
    };

    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      chart.off('click', handleClick);
    };
  }, [relationships, protagonistName, activeRelNode, onSelectNode, paperTheme]);

  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: 450,
        position: 'relative',
        userSelect: 'none',
        borderRadius: 8,
      }}
    />
  );
};
