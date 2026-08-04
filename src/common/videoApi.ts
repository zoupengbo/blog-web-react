import request from './request';

export interface VideoFormat {
    format_id: string;
    ext: string;
    resolution: string;
    filesize: number;
    format_note: string;
}

export interface VideoInfo {
    title: string;
    thumbnail: string;
    duration: number;
    formats: VideoFormat[];
}

/**
 * 获取视频信息
 * @param url 视频URL
 */
export const getVideoInfo = (url: string) => {
    return request.get<{ code: number, data: VideoInfo }>('/video/info', {
        params: { url },
        timeout: 60000 // 增加到 60 秒，因为 yt-dlp 解析可能较慢
    });
};

/**
 * 获取下载URL
 * @param url 视频URL
 * @param formatId 格式ID
 */
export const getVideoDownloadUrl = (url: string, formatId?: string) => {
    // 这里的 baseUrl 应该对应 setupProxy.js 中的配置
    // 由于 proxy 将 /api 转发到了 /api/v1，所以这里用 /api 即可
    const baseUrl = process.env.REACT_APP_BASE_URL || '/api';
    let downloadUrl = `${baseUrl}/video/download?url=${encodeURIComponent(url)}`;
    if (formatId) {
        downloadUrl += `&formatId=${formatId}`;
    }
    return downloadUrl;
};
