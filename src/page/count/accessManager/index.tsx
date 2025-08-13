import React from 'react';
import { Chart } from './components/Chart';
import { Card, Row, Col, Statistic, Progress, Avatar, List, Tag } from 'antd';
import {
  UserOutlined,
  FileTextOutlined,
  EyeOutlined,
  LikeOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons';
import './index.scss';

const AccessManager: React.FC = () => {
    const currentYear = new Date().getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);

    const chartOption = {
        title: {
            text: `${currentYear}年访问量统计`,
            textStyle: {
                fontSize: 16,
                fontWeight: '600',
                color: '#333'
            },
            left: 'center',
            top: 10
        },
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(0,0,0,0.85)',
            borderColor: '#1890ff',
            borderWidth: 1,
            textStyle: {
                color: '#fff',
                fontSize: 12
            },
            axisPointer: {
                type: 'shadow',
                shadowStyle: {
                    color: 'rgba(24, 144, 255, 0.1)'
                }
            }
        },
        grid: {
            left: '5%',
            right: '5%',
            bottom: '10%',
            top: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: months,
            axisTick: {
                alignWithLabel: true,
                lineStyle: {
                    color: '#666'
                }
            },
            axisLine: {
                lineStyle: {
                    color: '#d9d9d9'
                }
            },
            axisLabel: {
                color: '#333',
                fontSize: 12,
                fontWeight: 'normal'
            }
        },
        yAxis: {
            type: 'value',
            axisLine: {
                lineStyle: {
                    color: '#d9d9d9'
                }
            },
            axisTick: {
                lineStyle: {
                    color: '#666'
                }
            },
            axisLabel: {
                color: '#333',
                fontSize: 12,
                fontWeight: 'normal'
            },
            splitLine: {
                lineStyle: {
                    color: '#f0f0f0',
                    type: 'dashed'
                }
            }
        },
        series: [{
            name: '访问量',
            type: 'bar',
            data: [1200, 1800, 2400, 1600, 2200, 2800, 2100, 2600, 3200, 2900, 3500, 4200],
            itemStyle: {
                color: {
                    type: 'linear',
                    x: 0,
                    y: 0,
                    x2: 0,
                    y2: 1,
                    colorStops: [{
                        offset: 0, color: '#1890ff'
                    }, {
                        offset: 1, color: '#40a9ff'
                    }]
                }
            },
            barWidth: '60%',
            emphasis: {
                itemStyle: {
                    color: '#096dd9'
                }
            }
        }]
    };

    const recentArticles = [
        { title: 'React Hooks 最佳实践', views: 1234, date: '2024-01-15', status: 'published' },
        { title: 'TypeScript 进阶指南', views: 987, date: '2024-01-14', status: 'published' },
        { title: 'Node.js 性能优化', views: 756, date: '2024-01-13', status: 'draft' },
        { title: 'CSS Grid 布局详解', views: 543, date: '2024-01-12', status: 'published' },
        { title: 'Vue 3 组合式API', views: 432, date: '2024-01-11', status: 'published' },
    ];

    return (
        <div className="dashboard-container">
            {/* 统计卡片 */}
            <Row gutter={[24, 24]} className="stats-row">
                <Col xs={24} sm={12} lg={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="总访问量"
                            value={28456}
                            prefix={<EyeOutlined />}
                            suffix={
                                <span className="trend up">
                                    <ArrowUpOutlined /> 12.5%
                                </span>
                            }
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="文章总数"
                            value={156}
                            prefix={<FileTextOutlined />}
                            suffix={
                                <span className="trend up">
                                    <ArrowUpOutlined /> 8.2%
                                </span>
                            }
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="用户数量"
                            value={2847}
                            prefix={<UserOutlined />}
                            suffix={
                                <span className="trend down">
                                    <ArrowDownOutlined /> 2.1%
                                </span>
                            }
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card className="stat-card">
                        <Statistic
                            title="点赞总数"
                            value={8934}
                            prefix={<LikeOutlined />}
                            suffix={
                                <span className="trend up">
                                    <ArrowUpOutlined /> 15.3%
                                </span>
                            }
                        />
                    </Card>
                </Col>
            </Row>

            {/* 图表和最近文章 */}
            <Row gutter={[24, 24]} className="content-row">
                <Col xs={24} lg={16}>
                    <Card title="访问量趋势" className="chart-card">
                        <Chart options={chartOption} style={{ width: '100%', height: '400px' }} />
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Card title="最近文章" className="article-card">
                        <List
                            itemLayout="horizontal"
                            dataSource={recentArticles}
                            renderItem={(item) => (
                                <List.Item>
                                    <List.Item.Meta
                                        avatar={<Avatar icon={<FileTextOutlined />} />}
                                        title={
                                            <div className="article-title">
                                                {item.title}
                                                <Tag color={item.status === 'published' ? 'green' : 'orange'}>
                                                    {item.status === 'published' ? '已发布' : '草稿'}
                                                </Tag>
                                            </div>
                                        }
                                        description={
                                            <div className="article-meta">
                                                <span>{item.date}</span>
                                                <span>{item.views} 次浏览</span>
                                            </div>
                                        }
                                    />
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>
            </Row>

            {/* 系统状态 */}
            <Row gutter={[24, 24]} className="status-row">
                <Col xs={24} md={12}>
                    <Card title="系统状态" className="status-card">
                        <div className="status-item">
                            <span>CPU 使用率</span>
                            <Progress percent={45} status="active" />
                        </div>
                        <div className="status-item">
                            <span>内存使用率</span>
                            <Progress percent={67} status="active" />
                        </div>
                        <div className="status-item">
                            <span>磁盘使用率</span>
                            <Progress percent={23} />
                        </div>
                    </Card>
                </Col>
                <Col xs={24} md={12}>
                    <Card title="快速操作" className="quick-actions">
                        <div className="action-buttons">
                            <div className="action-btn">
                                <FileTextOutlined />
                                <span>写文章</span>
                            </div>
                            <div className="action-btn">
                                <UserOutlined />
                                <span>用户管理</span>
                            </div>
                            <div className="action-btn">
                                <EyeOutlined />
                                <span>查看统计</span>
                            </div>
                            <div className="action-btn">
                                <LikeOutlined />
                                <span>评论管理</span>
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export { AccessManager };
