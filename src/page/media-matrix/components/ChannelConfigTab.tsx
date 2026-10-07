import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Form,
  Input,
  Switch,
  Button,
  Tag,
  Alert,
  Typography,
  message,
  Space,
  Spin,
  Select,
  Radio
} from 'antd';
import {
  WechatOutlined,
  SaveOutlined,
  SafetyCertificateOutlined,
  RobotOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { MediaMatrixApi } from '../services/mediaMatrixApi';
import { ChannelConfigItem } from '../types';

const { Text, Paragraph } = Typography;

export const ChannelConfigTab: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [savingWx, setSavingWx] = useState<boolean>(false);
  const [testingWx, setTestingWx] = useState<boolean>(false);
  const [savingTt, setSavingTt] = useState<boolean>(false);
  const [testingTt, setTestingTt] = useState<boolean>(false);
  const [savingAi, setSavingAi] = useState<boolean>(false);
  const [testingAi, setTestingAi] = useState<boolean>(false);
  const [aiConfigId, setAiConfigId] = useState<number | undefined>(undefined);
  const [ttAuthMode, setTtAuthMode] = useState<string>('cookie');

  const [wxForm] = Form.useForm();
  const [ttForm] = Form.useForm();
  const [aiForm] = Form.useForm();

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const res: any = await MediaMatrixApi.getChannels();
      if (res && res.data) {
        const channels: ChannelConfigItem[] = res.data;
        const wx = channels.find(c => c.channel === 'wechat');
        const tt = channels.find(c => c.channel === 'toutiao');

        if (wx) {
          wxForm.setFieldsValue({
            appId: wx.appId,
            appSecret: wx.hasSecret ? wx.appSecretMasked : '',
            isMockMode: wx.isMockMode,
            thumbMediaId: wx.extraConfig?.thumbMediaId || '',
            defaultAuthor: wx.extraConfig?.defaultAuthor || 'AI 资讯精选'
          });
        }

        if (tt) {
          const mode = tt.extraConfig?.authMode || (tt.extraConfig?.cookie ? 'cookie' : (tt.appId ? 'open_api' : 'cookie'));
          setTtAuthMode(mode);
          ttForm.setFieldsValue({
            authMode: mode,
            isMockMode: tt.isMockMode,
            cookie: tt.extraConfig?.cookie || '',
            appId: tt.appId || '',
            appSecret: tt.hasSecret ? tt.appSecretMasked : '',
            accessToken: tt.extraConfig?.accessToken || ''
          });
        }
      }

      // 获取当前 AI 配置
      const aiRes: any = await MediaMatrixApi.getAiConfig();
      if (aiRes && aiRes.data) {
        setAiConfigId(aiRes.data.id);
        aiForm.setFieldsValue({
          name: aiRes.data.name || 'AI 写作模型',
          baseUrl: aiRes.data.baseUrl,
          modelName: aiRes.data.modelName,
          apiKey: aiRes.data.hasKey ? aiRes.data.apiKeyMasked : '',
          temperature: aiRes.data.temperature || 0.7,
          maxTokens: aiRes.data.maxTokens || 8192
        });
      }
    } catch (err: any) {
      message.error(err.message || '加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const handleSaveWechat = async () => {
    try {
      const values = await wxForm.validateFields();
      setSavingWx(true);
      await MediaMatrixApi.saveChannel({
        channel: 'wechat',
        appId: values.appId,
        appSecret: values.appSecret && !values.appSecret.includes('****') ? values.appSecret : undefined,
        isMockMode: values.isMockMode,
        extraConfig: {
          thumbMediaId: values.thumbMediaId,
          defaultAuthor: values.defaultAuthor
        }
      });
      message.success('微信公众号配置已保存！');
      loadConfigs();
    } catch (err: any) {
      message.error(err.message || '保存失败');
    } finally {
      setSavingWx(false);
    }
  };

  const handleTestWechat = async () => {
    try {
      const values = await wxForm.validateFields(['appId']);
      const currentSecret = wxForm.getFieldValue('appSecret');
      setTestingWx(true);
      const res: any = await MediaMatrixApi.testChannel({
        channel: 'wechat',
        appId: values.appId,
        appSecret: currentSecret && !currentSecret.includes('****') ? currentSecret : undefined
      });
      if (res && res.code === 200) {
        message.success(res.msg || '微信接口通信测试成功，凭据有效！');
      } else {
        const errorDetail = res?.data?.suggestion ? `${res.msg}（${res.data.suggestion}）` : (res?.msg || '微信凭据测试失败');
        message.error(errorDetail, 6);
      }
    } catch (err: any) {
      message.error(err.message || '微信接口通信测试失败');
    } finally {
      setTestingWx(false);
    }
  };

  const handleSaveToutiao = async () => {
    try {
      const values = await ttForm.validateFields();
      setSavingTt(true);
      await MediaMatrixApi.saveChannel({
        channel: 'toutiao',
        appId: values.appId,
        appSecret: values.appSecret && !values.appSecret.includes('****') ? values.appSecret : undefined,
        isMockMode: values.isMockMode,
        extraConfig: {
          authMode: values.authMode,
          cookie: values.cookie,
          accessToken: values.accessToken
        }
      });
      message.success('今日头条配置已保存！');
      loadConfigs();
    } catch (err: any) {
      message.error(err.message || '保存失败');
    } finally {
      setSavingTt(false);
    }
  };

  const handleTestToutiao = async () => {
    try {
      const values = await ttForm.getFieldsValue();
      setTestingTt(true);
      const res: any = await MediaMatrixApi.testChannel({
        channel: 'toutiao',
        authMode: values.authMode,
        cookie: values.cookie,
        accessToken: values.accessToken
      });
      if (res && res.code === 200) {
        message.success(res.msg || '今日头条凭据校验成功！');
      } else {
        message.error(res?.msg || '今日头条凭据测试未通过');
      }
    } catch (err: any) {
      message.error(err.message || '今日头条通信测试失败');
    } finally {
      setTestingTt(false);
    }
  };

  const handleSaveAi = async () => {
    try {
      const values = await aiForm.validateFields();
      setSavingAi(true);
      await MediaMatrixApi.saveAiConfig({
        id: aiConfigId,
        name: values.name,
        baseUrl: values.baseUrl,
        modelName: values.modelName,
        apiKey: values.apiKey && !values.apiKey.includes('****') ? values.apiKey : undefined,
        temperature: values.temperature,
        maxTokens: values.maxTokens
      });
      message.success('AI 模型配置已保存！');
      loadConfigs();
    } catch (err: any) {
      message.error(err.message || '保存失败');
    } finally {
      setSavingAi(false);
    }
  };

  const handleTestAi = async () => {
    try {
      const values = await aiForm.validateFields();
      setTestingAi(true);
      const res: any = await MediaMatrixApi.testAiConfig({
        baseUrl: values.baseUrl,
        modelName: values.modelName,
        apiKey: values.apiKey && !values.apiKey.includes('****') ? values.apiKey : undefined
      });
      if (res && res.code === 200) {
        message.success('AI 大模型通信测试成功！');
      } else {
        message.error(res?.msg || 'AI 连接测试未通过');
      }
    } catch (err: any) {
      message.error(err.message || '测试失败');
    } finally {
      setTestingAi(false);
    }
  };

  const handleApplyPreset = (presetKey: string) => {
    const PRESETS: Record<string, { name: string; baseUrl: string; modelName: string }> = {
      deepseek: {
        name: 'DeepSeek 官方',
        baseUrl: 'https://api.deepseek.com/v1',
        modelName: 'deepseek-chat'
      },
      siliconflow: {
        name: '硅基流动 (DeepSeek V3)',
        baseUrl: 'https://api.siliconflow.cn/v1',
        modelName: 'deepseek-ai/DeepSeek-V3'
      },
      qwen: {
        name: '阿里通义千问 (DashScope)',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        modelName: 'qwen-plus'
      },
      openai: {
        name: 'OpenAI 官方 (GPT-4o mini)',
        baseUrl: 'https://api.openai.com/v1',
        modelName: 'gpt-4o-mini'
      }
    };
    const target = PRESETS[presetKey];
    if (target) {
      aiForm.setFieldsValue({
        name: target.name,
        baseUrl: target.baseUrl,
        modelName: target.modelName
      });
    }
  };

  return (
    <div>
      <Alert
        message="自媒体矩阵渠道连接指南"
        description="系统采用「真实凭据接入」与「沙盒模拟演练」双模驱动设计。未获取正式发布权限或处于本地研发阶段时，可开启【沙盒模拟模式】，所有流程均能完整演练并生成虚拟草稿与审计日志；配置真实凭据并关闭模拟模式后，文章将真实推送到官方草稿箱。"
        type="info"
        showIcon
        style={{ marginBottom: 20, borderRadius: 8 }}
      />

      <Spin spinning={loading}>
        <Row gutter={20}>
        {/* 微信公众号配置 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <WechatOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                <span>微信公众号 (官方草稿箱对接)</span>
              </Space>
            }
            style={{ borderRadius: 8, marginBottom: 20 }}
            extra={
              <Tag color="green">草稿箱接口 draft/add</Tag>
            }
          >
            <Form form={wxForm} layout="vertical">
              <Form.Item
                name="isMockMode"
                label="模拟沙盒模式"
                valuePropName="checked"
                extra="开启后不实际请求微信外部 API，安全模拟生成草稿流水号，用于前端和业务自检。"
              >
                <Switch checkedChildren="开启模拟" unCheckedChildren="真实调用" />
              </Form.Item>

              <Form.Item
                name="appId"
                label="开发者 ID (AppID)"
                extra="登录微信公众平台 -> 开发 -> 基本配置 -> 开发者ID(AppID)"
              >
                <Input placeholder="如：wx1234567890abcdef" />
              </Form.Item>

              <Form.Item
                name="appSecret"
                label="开发者密码 (AppSecret)"
                extra="已做掩码脱敏存储。如需更新，直接在此输入新的 AppSecret 即可保存覆盖。"
              >
                <Input.Password placeholder="输入新的 AppSecret (留空则保持现有密码不变)" />
              </Form.Item>

              <Form.Item
                name="thumbMediaId"
                label="默认图文封面素材 MediaID (可选)"
                extra="微信接口要求图文必须含有封面图。可在公众号素材管理中上传图片并获取 media_id 填入此处。"
              >
                <Input placeholder="输入永久图文封面 media_id (留空将采用默认占位)" />
              </Form.Item>

              <Form.Item
                name="defaultAuthor"
                label="默认文章署名"
              >
                <Input placeholder="如：AI 资讯精选" />
              </Form.Item>

              <Space style={{ width: '100%', marginTop: 8 }}>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={savingWx}
                  onClick={handleSaveWechat}
                >
                  保存微信配置
                </Button>
                <Button
                  icon={<SafetyCertificateOutlined />}
                  loading={testingWx}
                  onClick={handleTestWechat}
                >
                  测试微信接口连通性
                </Button>
              </Space>
            </Form>
          </Card>
        </Col>

        {/* 今日头条配置 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <SafetyCertificateOutlined style={{ color: '#f5222d', fontSize: 20 }} />
                <span>今日头条 (头条号开放平台)</span>
              </Space>
            }
            style={{ borderRadius: 8, marginBottom: 20 }}
            extra={
              <Tag color="volcano">开放平台 API</Tag>
            }
          >
            <Form form={ttForm} layout="vertical">
              <Form.Item
                name="isMockMode"
                label="模拟沙盒模式"
                valuePropName="checked"
                extra="开启后模拟向今日头条开放平台推送草稿，安全演练排版和数据记录。"
              >
                <Switch checkedChildren="开启模拟" unCheckedChildren="真实调用" />
              </Form.Item>

              <Form.Item
                name="authMode"
                label="对接模式"
                extra="个人头条号推荐使用「创作者后台 Cookie」模式，无需企业营业执照资质。"
              >
                <Radio.Group
                  value={ttAuthMode}
                  onChange={e => setTtAuthMode(e.target.value)}
                  buttonStyle="solid"
                >
                  <Radio.Button value="cookie">创作者后台 Cookie 直连 (个人推荐)</Radio.Button>
                  <Radio.Button value="open_api">开放平台 Open API (需企业资质)</Radio.Button>
                </Radio.Group>
              </Form.Item>

              {ttAuthMode === 'cookie' ? (
                <>
                  <Form.Item
                    name="cookie"
                    label="头条号创作者 Cookie (必填)"
                    extra="打开电脑浏览器登录 mp.toutiao.com -> F12 网络控制台 -> 复制任意请求中的 Cookie 标头粘贴于此。"
                  >
                    <Input.TextArea
                      rows={4}
                      placeholder="如：odin_tt=...; sessionid=...; passport_csrf_token=...;"
                    />
                  </Form.Item>
                </>
              ) : (
                <>
                  <Form.Item
                    name="appId"
                    label="应用 ClientKey / AppID"
                    extra="头条号开放平台创建应用后获取的 Client Key"
                  >
                    <Input placeholder="如：tt_client_key_xxx" />
                  </Form.Item>

                  <Form.Item
                    name="appSecret"
                    label="应用 ClientSecret"
                    extra="已做掩码存储。如需更新请输入新 Secret。"
                  >
                    <Input.Password placeholder="输入新的 ClientSecret" />
                  </Form.Item>

                  <Form.Item
                    name="accessToken"
                    label="用户授权 AccessToken"
                    extra="头条号授权后获得的 access_token。"
                  >
                    <Input placeholder="输入授权 AccessToken" />
                  </Form.Item>
                </>
              )}

              <Space style={{ width: '100%', marginTop: 8 }}>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={savingTt}
                  onClick={handleSaveToutiao}
                >
                  保存今日头条配置
                </Button>
                <Button
                  icon={<SafetyCertificateOutlined />}
                  loading={testingTt}
                  onClick={handleTestToutiao}
                >
                  测试今日头条连通性
                </Button>
              </Space>
            </Form>
          </Card>
        </Col>

        {/* AI 生成大模型引擎配置 */}
        <Col span={24}>
          <Card
            title={
              <Space>
                <RobotOutlined style={{ color: '#722ed1', fontSize: 20 }} />
                <span>AI 长文深度写作模型引擎配置 (支持 DeepSeek / 硅基流动 / OpenAI 等)</span>
              </Space>
            }
            style={{ borderRadius: 8, marginBottom: 20 }}
            extra={
              <Tag color="purple">长文生产核心驱动</Tag>
            }
          >
            <Form form={aiForm} layout="vertical">
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item label="快速填充主流预设">
                    <Select placeholder="选择厂商一键套用 BaseURL 与模型" onChange={handleApplyPreset}>
                      <Select.Option value="deepseek">DeepSeek 官方 (性价比之王)</Select.Option>
                      <Select.Option value="siliconflow">硅基流动 SiliconFlow (DeepSeek-V3)</Select.Option>
                      <Select.Option value="qwen">阿里通义千问 (DashScope)</Select.Option>
                      <Select.Option value="openai">OpenAI 官方 (GPT-4o mini)</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="name" label="预设名称" rules={[{ required: true }]}>
                    <Input placeholder="如：DeepSeek 爆款写作" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="modelName" label="模型标识 (Model Name)" rules={[{ required: true }]}>
                    <Input placeholder="如：deepseek-chat 或 gpt-4o-mini" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item name="baseUrl" label="API 接口地址 (Base URL)" rules={[{ required: true }]}>
                    <Input placeholder="如：https://api.deepseek.com/v1" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="apiKey" label="API 密钥 (API Key)" extra="已加密脱敏。如需更新请输入新 Key。">
                    <Input.Password placeholder="输入大模型 API Key (如 sk-...)" />
                  </Form.Item>
                </Col>
              </Row>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <Button
                  icon={<ThunderboltOutlined />}
                  loading={testingAi}
                  onClick={handleTestAi}
                >
                  测试模型连通性
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={savingAi}
                  onClick={handleSaveAi}
                  style={{ background: 'linear-gradient(135deg, #722ed1 0%, #1890ff 100%)', border: 'none' }}
                >
                  保存 AI 写作模型配置
                </Button>
              </div>
            </Form>
          </Card>
        </Col>
        </Row>
      </Spin>

      {/* 排错与注意事项 */}
      <Card title="💡 微信公众平台常见错误排查 (FAQ)" style={{ borderRadius: 8 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Text strong>1. 错误码 40164 (IP not in whitelist)</Text>
            <Paragraph style={{ color: '#666', fontSize: 13, marginTop: 4 }}>
              <strong>原因：</strong>发起请求的服务器公网 IP 未加入微信白名单。<br />
              <strong>解决：</strong>前往微信公众平台后台 →「设置与开发」→「基本配置」→「IP白名单」，将服务器公网 IP 添加并保存。
            </Paragraph>
          </Col>
          <Col span={8}>
            <Text strong>2. 错误码 40001 (invalid credential)</Text>
            <Paragraph style={{ color: '#666', fontSize: 13, marginTop: 4 }}>
              <strong>原因：</strong>AppID 或 AppSecret 填写有误，或者微信后台重置了密码。<br />
              <strong>解决：</strong>在微信后台重新生成 AppSecret 并同步更新到此处。
            </Paragraph>
          </Col>
          <Col span={8}>
            <Text strong>3. 错误码 40007 / 40066 (invalid media_id)</Text>
            <Paragraph style={{ color: '#666', fontSize: 13, marginTop: 4 }}>
              <strong>原因：</strong>图文封面素材 thumb_media_id 不存在或已过期。<br />
              <strong>解决：</strong>在公众号后台上传一张通用封面图并复制其 media_id 填入上方配置项中。
            </Paragraph>
          </Col>
        </Row>
      </Card>
    </div>
  );
};
