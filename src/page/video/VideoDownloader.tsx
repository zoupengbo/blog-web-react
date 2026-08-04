import React, { useState, useRef } from 'react';
import { Input, Button, Card, List, Typography, Space, Image, message, Spin, Tag, Divider } from 'antd';
import { DownloadOutlined, SearchOutlined, VideoCameraOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { getVideoInfo, getVideoDownloadUrl, VideoInfo, VideoFormat } from '../../common/videoApi';

const { Title, Text } = Typography;

const VideoDownloader: React.FC = () => {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const handleSearch = async () => {
        if (!url) {
            message.warning('请输入视频URL');
            return;
        }

        setLoading(true);
        setPreviewUrl(null); // 重置预览
        try {
            const res = await getVideoInfo(url);
            if (res.data.code === 200) {
                setVideoInfo(res.data.data);
                message.success('解析成功');
            } else {
                message.error('解析失败');
            }
        } catch (error) {
            console.error('Search error:', error);
            message.error('请求出错，请检查后端服务');
        } finally {
            setLoading(false);
        }
    };

    const formatSize = (bytes: number) => {
        if (!bytes) return '未知大小';
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(2)} ${units[unitIndex]}`;
    };

    const handleDownload = (formatId: string) => {
        const downloadUrl = getVideoDownloadUrl(url, formatId);
        window.open(downloadUrl, '_blank');
    };

    const handlePreview = (formatId: string) => {
        const downloadUrl = getVideoDownloadUrl(url, formatId);
        setPreviewUrl(downloadUrl);
        // 等待状态更新后滚动到播放器
        setTimeout(() => {
            videoRef.current?.scrollIntoView({ behavior: 'smooth' });
            videoRef.current?.play();
        }, 100);
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
            <Card title={<Space><VideoCameraOutlined /> 全能视频下载与预览</Space>}>
                <Space.Compact style={{ width: '100%' }}>
                    <Input 
                        placeholder="输入视频网站 URL (如 YouTube, Bilibili, TikTok...)" 
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onPressEnter={handleSearch}
                    />
                    <Button type="primary" onClick={handleSearch} icon={<SearchOutlined />} loading={loading}>
                        解析视频
                    </Button>
                </Space.Compact>
                <Text type="secondary" style={{ display: 'block', marginTop: '8px' }}>
                    支持 1000+ 视频网站。注意：Bilibili 1080P 以上需登录，暂提供基础清晰度预览。
                </Text>
            </Card>

            {loading && <div style={{ textAlign: 'center', marginTop: '40px' }}><Spin size="large" tip="正在通过深度引擎解析视频..." /></div>}

            {videoInfo && !loading && (
                <div style={{ display: 'grid', gridTemplateColumns: previewUrl ? '1fr 1fr' : '1fr', gap: '24px', marginTop: '24px' }}>
                    {/* 左侧/上方：视频详情与列表 */}
                    <Card>
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
                            <Image
                                width={160}
                                src={videoInfo.thumbnail}
                                fallback="https://via.placeholder.com/160x90?text=No+Thumbnail"
                            />
                            <div>
                                <Title level={4} ellipsis={{ rows: 2 }}>{videoInfo.title}</Title>
                                <Tag color="gold">时长: {Math.floor(videoInfo.duration / 60)}分{Math.round(videoInfo.duration % 60)}秒</Tag>
                            </div>
                        </div>

                        <Divider orientation="left">选择格式</Divider>
                        <List
                            itemLayout="horizontal"
                            dataSource={videoInfo.formats}
                            size="small"
                            renderItem={(item: VideoFormat) => (
                                <List.Item
                                    actions={[
                                        <Button 
                                            size="small"
                                            icon={<PlayCircleOutlined />} 
                                            onClick={() => handlePreview(item.format_id)}
                                            disabled={item.resolution === 'audio only'}
                                        >
                                            预览
                                        </Button>,
                                        <Button 
                                            size="small"
                                            type="primary"
                                            ghost
                                            icon={<DownloadOutlined />} 
                                            onClick={() => handleDownload(item.format_id)}
                                        >
                                            下载
                                        </Button>
                                    ]}
                                >
                                    <List.Item.Meta
                                        title={<Space>{item.resolution} <Tag color={item.ext === 'mp4' ? 'green' : 'blue'}>{item.ext}</Tag></Space>}
                                        description={formatSize(item.filesize)}
                                    />
                                </List.Item>
                            )}
                        />
                    </Card>

                    {/* 右侧：视频播放器 */}
                    {previewUrl && (
                        <Card title="视频预览">
                            <video 
                                ref={videoRef}
                                controls 
                                width="100%" 
                                style={{ borderRadius: '8px', backgroundColor: '#000' }}
                                src={previewUrl}
                            >
                                您的浏览器不支持 HTML5 视频播放。
                            </video>
                            <div style={{ marginTop: '12px' }}>
                                <Text type="warning">提示：部分网站（如 Bilibili）预览时可能无声（因音轨分离）。</Text>
                            </div>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
};

export default VideoDownloader;
