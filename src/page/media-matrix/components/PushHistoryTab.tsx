import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Select,
  Typography,
  message,
  Alert
} from 'antd';
import {
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WechatOutlined,
  SettingOutlined,
  EditOutlined
} from '@ant-design/icons';
import { MediaMatrixApi } from '../services/mediaMatrixApi';
import { PushRecordItem, DraftArticleItem } from '../types';

const { Text } = Typography;

interface PushHistoryTabProps {
  onNavigateToConfig?: () => void;
  onEditArticle?: (article: DraftArticleItem) => void;
}

export const PushHistoryTab: React.FC<PushHistoryTabProps> = ({ onNavigateToConfig, onEditArticle }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<PushRecordItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 15 });
  const [retryingId, setRetryingId] = useState<number | null>(null);

  const loadData = async (channel = selectedChannel, page = pagination.current, pageSize = pagination.pageSize) => {
    setLoading(true);
    try {
      const res: any = await MediaMatrixApi.getPushHistory({
        channel: channel || undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize
      });
      if (res && res.data) {
        setData(res.data.items || []);
        setTotal(res.data.total || 0);
      }
    } catch (err: any) {
      message.error(err.message || '加载推送历史失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRetry = async (record: PushRecordItem) => {
    setRetryingId(record.id);
    try {
      const res: any = await MediaMatrixApi.retryPush(record.id);
      if (res && res.code === 200) {
        message.success('重试推送成功！');
      } else {
        message.warning(res?.msg || '重试推送仍未成功');
      }
    } catch (err: any) {
      // 错误已由拦截器处理
    } finally {
      loadData();
      setRetryingId(null);
    }
  };

  const handleMockAndRetry = async (record: PushRecordItem) => {
    setRetryingId(record.id);
    try {
      const res: any = await MediaMatrixApi.mockAndRetry({
        channel: record.channel,
        pushRecordId: record.id
      });
      if (res && res.code === 200) {
        message.success(res.msg || '已切换为沙盒模式并演练成功！');
      } else {
        message.warning(res?.msg || '操作完成');
      }
    } catch (err: any) {
      message.error(err.message || '操作失败');
    } finally {
      loadData();
      setRetryingId(null);
    }
  };

  const columns = [
    {
      title: '推送时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170
    },
    {
      title: '推送渠道',
      dataIndex: 'channel',
      key: 'channel',
      width: 130,
      render: (ch: string) => {
        if (ch === 'wechat') {
          return <Tag color="green" icon={<WechatOutlined />}>微信公众号</Tag>;
        }
        if (ch === 'toutiao') {
          return <Tag color="volcano">今日头条</Tag>;
        }
        return <Tag>{ch}</Tag>;
      }
    },
    {
      title: '文章标题',
      dataIndex: 'articleTitle',
      key: 'articleTitle',
      render: (title: string) => (
        <Text strong style={{ fontSize: 14 }}>{title}</Text>
      )
    },
    {
      title: '推送状态',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: string) => {
        if (status === 'success') {
          return <Tag color="success" icon={<CheckCircleOutlined />}>真实推送成功</Tag>;
        }
        if (status === 'mock_success') {
          return <Tag color="processing" icon={<CheckCircleOutlined />}>模拟演练成功</Tag>;
        }
        if (status === 'failed') {
          return <Tag color="error" icon={<CloseCircleOutlined />}>推送失败</Tag>;
        }
        return <Tag color="default">{status}</Tag>;
      }
    },
    {
      title: '平台草稿流水号 (MediaID)',
      dataIndex: 'mediaId',
      key: 'mediaId',
      width: 220,
      render: (mediaId: string) => {
        if (!mediaId) return <Text type="secondary">-</Text>;
        return (
          <Space>
            <Text code copyable ellipsis style={{ maxWidth: 160 }}>
              {mediaId}
            </Text>
          </Space>
        );
      }
    },
    {
      title: '执行反馈与排查建议',
      key: 'diagnostics',
      render: (_: any, record: PushRecordItem) => {
        if (record.status === 'failed') {
          return (
            <div>
              <Text type="danger" style={{ display: 'block', fontSize: 13 }}>
                [{record.errorCode || 'ERROR'}] {record.errorMessage}
              </Text>
              {record.suggestion && (
                <Text type="secondary" style={{ fontSize: 12, marginTop: 2, display: 'block' }}>
                  💡 {record.suggestion}
                </Text>
              )}
            </div>
          );
        }
        return (
          <Text type="secondary" style={{ fontSize: 13 }}>
            {record.errorMessage || '已成功入库平台草稿箱'}
          </Text>
        );
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_: any, record: PushRecordItem) => {
        const isAuthError =
          record.errorCode === '40125' ||
          record.errorCode === '40001' ||
          record.errorMessage?.includes('invalid appsecret') ||
          record.errorMessage?.includes('AccessToken 失败');

        return (
          <Space direction="vertical" size={4}>
            {record.draftArticleId && onEditArticle && (
              <Button
                size="small"
                type="primary"
                ghost
                icon={<EditOutlined />}
                onClick={async () => {
                  try {
                    const hide = message.loading('正在载入文章草稿...', 0);
                    const res: any = await MediaMatrixApi.getArticleDetail(record.draftArticleId);
                    hide();
                    if (res && res.data) {
                      onEditArticle(res.data);
                    } else {
                      message.error('未找到对应草稿内容');
                    }
                  } catch (e: any) {
                    message.error('载入草稿失败: ' + e.message);
                  }
                }}
              >
                编辑/重新发布
              </Button>
            )}
            <Button
              size="small"
              icon={<ReloadOutlined spin={retryingId === record.id} />}
              loading={retryingId === record.id}
              onClick={() => handleRetry(record)}
            >
              重试
            </Button>
            {record.status === 'failed' && isAuthError && (
              <Button
                size="small"
                type="dashed"
                style={{ color: '#fa8c16', borderColor: '#ffd591' }}
                loading={retryingId === record.id}
                onClick={() => handleMockAndRetry(record)}
              >
                切沙盒演练
              </Button>
            )}
          </Space>
        );
      }
    }
  ];

  const hasWechatAuthError = data.some(
    r =>
      r.channel === 'wechat' &&
      r.status === 'failed' &&
      (r.errorCode === '40125' || r.errorMessage?.includes('40125') || r.errorMessage?.includes('invalid appsecret'))
  );

  return (
    <Card style={{ borderRadius: 8 }}>
      {hasWechatAuthError && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16, borderRadius: 8 }}
          message="微信公众号凭据失效提醒 (40125 invalid appsecret)"
          description={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span>
                检测到微信官方返回开发者密码失效。通常是因为在微信公众平台后台点击过「重置」密码，或填写的 AppSecret 不匹配。您可以更新有效凭据，或直接点击记录上的「切沙盒演练」快速完成推送模拟。
              </span>
              {onNavigateToConfig && (
                <Button size="small" type="primary" icon={<SettingOutlined />} onClick={onNavigateToConfig}>
                  前往更新凭据
                </Button>
              )}
            </div>
          }
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Text strong>渠道筛选：</Text>
          <Select
            value={selectedChannel}
            onChange={val => {
              setSelectedChannel(val);
              loadData(val, 1, pagination.pageSize);
            }}
            style={{ width: 140 }}
          >
            <Select.Option value="">全部渠道</Select.Option>
            <Select.Option value="wechat">微信公众号</Select.Option>
            <Select.Option value="toutiao">今日头条</Select.Option>
          </Select>
        </Space>

        <Button
          icon={<ReloadOutlined />}
          onClick={() => loadData(selectedChannel, pagination.current, pagination.pageSize)}
        >
          刷新历史
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total,
          showSizeChanger: true,
          onChange: (page, pageSize) => {
            setPagination({ current: page, pageSize });
            loadData(selectedChannel, page, pageSize);
          }
        }}
      />
    </Card>
  );
};
