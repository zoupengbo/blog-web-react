import React, { useState, useEffect } from 'react';
import { Input, Button, Card, Space, Tag, Radio, Select, Spin, message, Empty, Divider, Tooltip, Alert } from 'antd';
import { 
  SearchOutlined, 
  ArrowUpOutlined, 
  ArrowDownOutlined, 
  GlobalOutlined, 
  ShopOutlined, 
  ThunderboltOutlined, 
  PieChartOutlined, 
  RobotOutlined,
  WarningOutlined,
  InteractionOutlined,
  LinkOutlined,
  SafetyCertificateOutlined,
  ExportOutlined
} from '@ant-design/icons';
import { 
  searchPrices, 
  aiAnalyzePrices, 
  PriceCompareItem, 
  PriceAnalysis 
} from '../../common/priceApi';
import './price-compare.scss';

const { Search } = Input;

const DEFAULT_HISTORY = ['iPhone 16', 'Switch OLED', '戴森吹风机', '飞利浦电动牙刷', '小米15'];

// Inline SVG placeholder for missing product images (no external dependency)
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+CiAgPHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmNWY1ZjUiLz4KICA8dGV4dCB4PSIxMDAiIHk9Ijk1IiBmb250LWZhbWlseT0iQXJpYWwsc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2JiYiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+5pqC5peg5Zu+54mHPC90ZXh0PgogIDxyZWN0IHg9Ijc1IiB5PSIxMTAiIHdpZHRoPSI1MCIgaGVpZ2h0PSIzNSIgcng9IjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2RkZCIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgPGNpcmNsZSBjeD0iODgiIGN5PSIxMjIiIHI9IjQiIGZpbGw9IiNkZGQiLz4KICA8cGF0aCBkPSJNODAgMTQwIEw5NSAxMjUgTDEwNSAxMzIgTDEyMCAxMTggTDEyMCAxNDAgWiIgZmlsbD0iI2U4ZThlOCIvPgo8L3N2Zz4=';

const PriceCompareDashboard: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PriceCompareItem[]>([]);
  const [platformLinks, setPlatformLinks] = useState<PriceCompareItem[]>([]);
  const [analysis, setAnalysis] = useState<PriceAnalysis | null>(null);
  
  // AI Analysis states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  
  // Search history state
  const [history, setHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('price_compare_history');
    return saved ? JSON.parse(saved) : DEFAULT_HISTORY;
  });

  // Filters & Sorting
  const [platformFilter, setPlatformFilter] = useState('All');
  const [itemTypeFilter, setItemTypeFilter] = useState('All');
  const [onlyOfficial, setOnlyOfficial] = useState(false);
  const [sortBy, setSortBy] = useState('priceAsc');

  const handleSearch = async (val: string) => {
    const searchVal = val.trim();
    if (!searchVal) {
      message.warning('请输入想要比价的商品名称');
      return;
    }

    setKeyword(searchVal);
    setLoading(true);
    setItems([]);
    setPlatformLinks([]);
    setAnalysis(null);
    setAiResult(null);
    setPlatformFilter('All');
    setItemTypeFilter('All');
    setOnlyOfficial(false);

    // Save history
    const newHistory = [searchVal, ...history.filter(h => h !== searchVal)].slice(0, 8);
    setHistory(newHistory);
    localStorage.setItem('price_compare_history', JSON.stringify(newHistory));

    try {
      const res = (await searchPrices(searchVal)) as any;
      if (res.code === 200 && res.data) {
        setItems(res.data.items);
        setPlatformLinks(res.data.platformLinks || []);
        setAnalysis(res.data.analysis);
        if (res.data.items.length === 0) {
          message.info('未在全网找到相关电商报价，请尝试其他关键词');
        } else {
          const platformCount = res.data.analysis?.platformCount || new Set(res.data.items.map((i: PriceCompareItem) => i.platform)).size;
          message.success(`成功获取 ${res.data.items.length} 条报价，覆盖 ${platformCount} 个平台！`);
        }
      } else {
        message.error('获取比价数据失败，请稍后重试');
      }
    } catch (err) {
      console.error('Search error:', err);
      message.error('请求接口出错，请检查网络或后端服务');
    } finally {
      setLoading(false);
    }
  };

  const handleAiAnalyze = async () => {
    if (items.length === 0) {
      message.warning('暂无商品数据可进行分析');
      return;
    }

    setAiLoading(true);
    try {
      const res = (await aiAnalyzePrices(keyword, items)) as any;
      if (res.code === 200 && res.data) {
        setAiResult(res.data.analysisText);
        message.success('AI 消费参谋分析报告生成成功！');
      } else {
        message.error('生成 AI 消费分析失败');
      }
    } catch (err) {
      console.error('AI analysis error:', err);
      message.error('请求 AI 服务出错，请稍后重试');
    } finally {
      setAiLoading(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('price_compare_history');
    message.success('历史记录已清除');
  };

  const getPlatformClass = (platform: string) => {
    switch (platform) {
      case '京东': return 'jd';
      case '淘宝': return 'taobao';
      case '天猫': return 'tmall';
      case '拼多多': return 'pinduoduo';
      case '唯品会': return 'vipshop';
      case '苏宁易购': return 'suning';
      case '抖音商城': return 'douyin';
      default: return 'other';
    }
  };

  // Filtered and Sorted products (exclude synthetic items from main list)
  const realItems = items.filter(item => !item.isSynthetic);
  const processedItems = realItems
    .filter(item => platformFilter === 'All' || item.platform === platformFilter)
    .filter(item => itemTypeFilter === 'All' || item.itemType === itemTypeFilter)
    .filter(item => !onlyOfficial || item.storeType === 'official')
    .sort((a, b) => {
      if (sortBy === 'priceAsc') return a.priceVal - b.priceVal;
      if (sortBy === 'priceDesc') return b.priceVal - a.priceVal;
      return 0;
    });

  // Helper to parse bold markers
  const parseBold = (textVal: string): React.ReactNode[] => {
    if (!textVal) return [];
    const boldParts = textVal.split('**');
    return boldParts.map((bPart, idx) => {
      if (idx % 2 === 1) return <strong key={`bold-${idx}`}>{bPart}</strong>;
      return bPart;
    });
  };

  // Helper to parse links and bold markers
  const renderTextWithLinksAndBold = (textStr: string) => {
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    let parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    
    while ((match = linkRegex.exec(textStr)) !== null) {
      const matchIndex = match.index;
      const linkText = match[1];
      const linkUrl = match[2];
      
      if (matchIndex > lastIndex) {
        parts.push(...parseBold(textStr.substring(lastIndex, matchIndex)));
      }
      
      parts.push(
        <a 
          key={`link-${matchIndex}`} 
          href={linkUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          style={{ color: '#1890ff', textDecoration: 'underline', fontWeight: 600 }}
        >
          {linkText}
        </a>
      );
      
      lastIndex = linkRegex.lastIndex;
    }
    
    if (lastIndex < textStr.length) {
      parts.push(...parseBold(textStr.substring(lastIndex)));
    }
    
    return parts;
  };

  // Markdown renderer for AI output
  const renderAiMarkdown = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    
    return lines.map((line, idx) => {
      let cleanLine = line.trim();
      if (!cleanLine) return <div key={idx} style={{ height: '8px' }} />;
      
      if (cleanLine.startsWith('【') && cleanLine.endsWith('】')) {
        return (
          <div key={idx} className="decision-badge">
            <RobotOutlined style={{ marginRight: '6px' }} />
            {cleanLine}
          </div>
        );
      }
      
      if (cleanLine.startsWith('### ')) return <h3 key={idx}>{renderTextWithLinksAndBold(cleanLine.replace('### ', ''))}</h3>;
      if (cleanLine.startsWith('## ')) return <h3 key={idx}>{renderTextWithLinksAndBold(cleanLine.replace('## ', ''))}</h3>;
      if (cleanLine.startsWith('# ')) return <h3 key={idx}>{renderTextWithLinksAndBold(cleanLine.replace('# ', ''))}</h3>;
      
      const isBullet = cleanLine.startsWith('- ') || cleanLine.startsWith('* ');
      if (isBullet) cleanLine = cleanLine.replace(/^[-*]\s+/, '');

      const content = renderTextWithLinksAndBold(cleanLine);

      if (isBullet) {
        return (
          <ul key={idx} style={{ margin: '4px 0', paddingLeft: '20px' }}>
            <li style={{ listStyleType: 'disc' }}>{content}</li>
          </ul>
        );
      }

      return <p key={idx}>{content}</p>;
    });
  };

  // Check if results quality is limited
  const platformsCovered = analysis?.platformsCovered || Array.from(new Set(realItems.map(i => i.platform)));
  const hasLimitedResults = realItems.length > 0 && realItems.length < 3;
  const hasSinglePlatform = realItems.length > 0 && platformsCovered.length === 1;

  return (
    <div className="price-compare-container">
      {/* Hero Banner Section */}
      <div className="price-compare-hero">
        <h1 className="hero-title">全网比价助手</h1>
        <p className="hero-subtitle">自动聚合全网各大电商平台实时底价，配合 AI 智能算力给出省钱最优解</p>
        
        <div className="search-box-wrapper">
          <Search
            placeholder="输入您想购买的商品，例如：iPhone 16, 飞利浦电动牙刷..."
            allowClear
            enterButton="全网比价"
            size="large"
            loading={loading}
            onSearch={handleSearch}
          />
        </div>

        {history.length > 0 && (
          <div className="history-tags">
            <span className="history-label">热搜商品：</span>
            {history.map(tag => (
              <span 
                key={tag} 
                className="history-tag"
                onClick={() => {
                  setKeyword(tag);
                  handleSearch(tag);
                }}
              >
                {tag}
              </span>
            ))}
            {history.length > 3 && (
              <span className="history-tag" style={{ background: 'transparent', borderColor: 'transparent', color: '#ff4d4f' }} onClick={clearHistory}>
                清除历史
              </span>
            )}
          </div>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" tip="正在并行抓取京东、淘宝、天猫、拼多多等平台报价，请稍后..." />
        </div>
      )}

      {!loading && keyword && (
        <>
          {realItems.length > 0 && analysis ? (
            <>
              {/* Quality warnings */}
              {(hasLimitedResults || hasSinglePlatform) && (
                <Alert
                  type="warning"
                  showIcon
                  style={{ marginBottom: '16px', borderRadius: '8px' }}
                  message={
                    hasSinglePlatform 
                      ? `当前抓取到的报价均来自「${platformsCovered[0]}」，其他平台暂未获取到数据。您可以点击下方各平台快捷入口手动对比。`
                      : `当前仅找到 ${realItems.length} 条报价，建议尝试更精确的关键词获取更多结果。`
                  }
                />
              )}

              {/* Stats Cards Section */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-header">
                    <span className="stat-title">全网最低价</span>
                    <span className="stat-icon lowest"><ThunderboltOutlined /></span>
                  </div>
                  <div className="stat-value" style={{ color: '#52c41a' }}>{analysis.lowestPrice}</div>
                  <div className="stat-desc">
                    来自【{analysis.lowestItem?.platform}】的 {analysis.lowestItem?.shop}
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-header">
                    <span className="stat-title">全网中位数均价</span>
                    <span className="stat-icon median"><PieChartOutlined /></span>
                  </div>
                  <div className="stat-value" style={{ color: '#1890ff' }}>{analysis.medianPrice}</div>
                  <div className="stat-desc">代表全网商家的一般平均定价水平</div>
                </div>

                <div className="stat-card">
                  <div className="stat-header">
                    <span className="stat-title">全网价差</span>
                    <span className="stat-icon range"><InteractionOutlined /></span>
                  </div>
                  <div className="stat-value" style={{ color: '#fa8c16' }}>{analysis.priceRange}</div>
                  <div className="stat-desc">最高报价与最低报价的分散区间</div>
                </div>
              </div>

              {/* Quick recommendation */}
              <Card style={{ marginBottom: '24px', background: '#f6ffed', border: '1px solid #b7eb8f' }}>
                <Space align="start">
                  <WarningOutlined style={{ color: '#52c41a', fontSize: '18px', marginTop: '3px' }} />
                  <div>
                    <strong style={{ fontSize: '1.05rem', color: '#237804' }}>购买最优解建议：</strong>
                    <p style={{ margin: '4px 0 0 0', color: '#389e0d' }}>{analysis.recommendation}</p>
                  </div>
                </Space>
              </Card>

              {/* Platform Quick Links — for platforms not covered by scraping */}
              {platformLinks.length > 0 && (
                <div className="platform-quick-links">
                  <div className="quick-links-header">
                    <GlobalOutlined style={{ marginRight: '6px' }} />
                    <span>其他平台快捷入口（点击直达对应平台搜索页）</span>
                  </div>
                  <div className="quick-links-grid">
                    {platformLinks.map((pl, idx) => (
                      <a 
                        key={idx}
                        className={`quick-link-btn ${getPlatformClass(pl.platform)}`}
                        href={pl.link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ShopOutlined />
                        <span>{pl.platform}</span>
                        <ExportOutlined style={{ fontSize: '11px' }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Advisor Card */}
              <div className="ai-advisor-card">
                <div className="ai-header">
                  <Space>
                    <RobotOutlined style={{ color: '#1890ff', fontSize: '1.2rem' }} />
                    <strong style={{ fontSize: '1.05rem', color: '#1f1f2e' }}>AI 深度消费参谋</strong>
                    <Tag color="blue">GPT 大模型决策</Tag>
                  </Space>
                </div>
                
                <div className="ai-body">
                  {!aiResult && !aiLoading && (
                    <div className="ai-untriggered">
                      <p>需要进一步判断报价的虚实、防范翻新翻包风险并获取优惠券购买建议吗？</p>
                      <Button 
                        type="primary" 
                        className="ai-btn" 
                        icon={<ThunderboltOutlined />} 
                        onClick={handleAiAnalyze}
                      >
                        生成 AI 深度分析报告
                      </Button>
                    </div>
                  )}

                  {aiLoading && (
                    <div className="ai-loading">
                      <Spin tip="AI 参谋正在通读报价、排查店铺风险、生成决策中，预计需要 5-10 秒..." />
                    </div>
                  )}

                  {aiResult && !aiLoading && (
                    <div className="ai-content">
                      {renderAiMarkdown(aiResult)}
                    </div>
                  )}
                </div>
              </div>

              {/* Filter Toolbar */}
              <div className="filter-bar-multidimensional">
                <div className="filter-row">
                  <span className="filter-label">平台筛选:</span>
                  <Radio.Group value={platformFilter} onChange={e => setPlatformFilter(e.target.value)} size="small">
                    <Radio.Button value="All">全部 ({realItems.length})</Radio.Button>
                    {Array.from(new Set(realItems.map(i => i.platform))).map(plat => (
                      <Radio.Button key={plat} value={plat}>
                        {plat} ({realItems.filter(i => i.platform === plat).length})
                      </Radio.Button>
                    ))}
                  </Radio.Group>
                </div>

                <div className="filter-row">
                  <span className="filter-label">商品类型:</span>
                  <Radio.Group value={itemTypeFilter} onChange={e => setItemTypeFilter(e.target.value)} size="small">
                    <Radio.Button value="All">全部 ({realItems.length})</Radio.Button>
                    <Radio.Button value="main">全新正品 ({realItems.filter(i => i.itemType === 'main').length})</Radio.Button>
                    {realItems.some(i => i.itemType === 'accessory') && (
                      <Radio.Button value="accessory">配件/周边 ({realItems.filter(i => i.itemType === 'accessory').length})</Radio.Button>
                    )}
                    {realItems.some(i => i.itemType === 'secondhand') && (
                      <Radio.Button value="secondhand">二手闲置 ({realItems.filter(i => i.itemType === 'secondhand').length})</Radio.Button>
                    )}
                    {realItems.some(i => i.itemType === 'service') && (
                      <Radio.Button value="service">服务/售后 ({realItems.filter(i => i.itemType === 'service').length})</Radio.Button>
                    )}
                    {realItems.some(i => i.itemType === 'deposit') && (
                      <Radio.Button value="deposit">定金/专拍 ({realItems.filter(i => i.itemType === 'deposit').length})</Radio.Button>
                    )}
                  </Radio.Group>
                </div>
                
                <div className="filter-row filter-row-last">
                  <div className="filter-item">
                    <span className="filter-label">店铺性质:</span>
                    <Radio.Group value={onlyOfficial ? 'official' : 'All'} onChange={e => setOnlyOfficial(e.target.value === 'official')} size="small">
                      <Radio.Button value="All">所有店铺 ({realItems.length})</Radio.Button>
                      <Radio.Button value="official">仅看官方/自营 ({realItems.filter(i => i.storeType === 'official').length})</Radio.Button>
                    </Radio.Group>
                  </div>

                  <div className="filter-item">
                    <span className="filter-label">排序方式:</span>
                    <Select value={sortBy} onChange={val => setSortBy(val)} style={{ width: 140 }} size="small">
                      <Select.Option value="priceAsc">价格由低到高</Select.Option>
                      <Select.Option value="priceDesc">价格由高到低</Select.Option>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Results Grid */}
              {processedItems.length > 0 ? (
                <div className="products-grid">
                  {processedItems.map((item, idx) => (
                    <div className="product-card" key={idx}>
                      <div className="image-container">
                        <img 
                          src={item.image || PLACEHOLDER_IMAGE} 
                          alt={item.title}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                          }}
                        />
                        <span className={`platform-badge ${getPlatformClass(item.platform)}`}>
                          {item.platform}
                        </span>
                      </div>
                      
                      <div className="card-content">
                        <div className="product-title" title={item.title}>
                          {item.title}
                        </div>

                        <div className="item-tags">
                          {item.storeType === 'official' && (
                            <Tag className="tag-official">
                              <SafetyCertificateOutlined /> 官方/自营
                            </Tag>
                          )}
                          {item.itemType === 'main' && <Tag className="tag-main">全新正品</Tag>}
                          {item.itemType === 'accessory' && <Tag className="tag-accessory">配件/周边</Tag>}
                          {item.itemType === 'secondhand' && <Tag className="tag-secondhand">二手闲置</Tag>}
                          {item.itemType === 'service' && <Tag className="tag-service">服务/售后</Tag>}
                          {item.itemType === 'deposit' && <Tag className="tag-deposit">定金/专拍</Tag>}
                        </div>
                        
                        <div className="price-line">
                          <span className="price-symbol">¥</span>
                          <span className="price-val">{item.price.replace(/[^\d.]/g, '')}</span>
                          <span className="price-suffix">到手价</span>
                        </div>
                        
                        <div className="shop-line">
                          <ShopOutlined />
                          <Tooltip title={item.shop}>
                            <span>{item.shop}</span>
                          </Tooltip>
                        </div>

                        <div className="buy-btn-wrapper">
                          {item.link ? (
                            <Button 
                              type="primary" 
                              className={`buy-btn ${getPlatformClass(item.platform)}`}
                              icon={<LinkOutlined />}
                              onClick={() => window.open(item.link, '_blank')}
                            >
                              直达购买
                            </Button>
                          ) : (
                            <Button type="default" className="buy-btn" disabled>
                              暂无购买链接
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty description="没有匹配当前筛选条件的商品报价" style={{ margin: '40px 0' }} />
              )}
            </>
          ) : (
            <div style={{ marginTop: '24px' }}>
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: '24px', borderRadius: '8px' }}
                message="暂无自动比价数据"
                description="抓取引擎暂时遇到反爬限制（安全验证码阻挡），未能获取到实时报价列表。您可以点击下方的快捷入口，一键直达各大电商官网手动进行比价："
              />
              {platformLinks.length > 0 && (
                <div className="platform-quick-links" style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: '12px', padding: '24px' }}>
                  <div className="quick-links-header" style={{ marginBottom: '16px', fontWeight: 600, color: '#262626' }}>
                    <GlobalOutlined style={{ marginRight: '6px', color: '#1890ff' }} />
                    <span>各平台比价快捷入口</span>
                  </div>
                  <div className="quick-links-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    {platformLinks.map((pl, idx) => (
                      <a 
                        key={idx}
                        className={`quick-link-btn ${getPlatformClass(pl.platform)}`}
                        href={pl.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ padding: '8px 16px', borderRadius: '6px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <ShopOutlined />
                        <span>{pl.platform}</span>
                        <ExportOutlined style={{ fontSize: '11px' }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!loading && !keyword && (
        <Card style={{ textAlign: 'center', padding: '60px 0', border: '1px dashed #d9d9d9', borderRadius: '12px' }}>
          <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span style={{ color: '#8c8c9e' }}>
                还没有进行搜索。在上方搜索框内输入商品关键词，比价助手将深度遍历全网报价。
              </span>
            }
          />
        </Card>
      )}
    </div>
  );
};

export default PriceCompareDashboard;
export { PriceCompareDashboard };
