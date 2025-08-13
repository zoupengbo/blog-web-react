import { Modal, Input, Form, Select, Tag, Button, message } from "antd";
import { SaveOutlined, EyeOutlined } from "@ant-design/icons";
import React, { useEffect, useState } from "react";
import ReactQuillEditor from "../components/ReactQuill";
import { saveArticle } from "../../../../common/articleApi";
import ArticlePreviewModal from "../components/ArticlePreviewModal";
import "./addArticleModal.scss";
interface editData {
  id?: React.Key;
  title: string;
  content: string;
  category?: string;
  status?: string;
  tags?: string[];
  summary?: string;
}

interface AppProps {
  open: boolean;
  editData: editData;
  onCancel: () => void;
  onSave: (data: String) => void;
}

const { Option } = Select;
const { TextArea } = Input;

const App: React.FC<AppProps> = (props) => {
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [articleText, setArticleText] = useState("");
  const [articleTitle, setArticleTitle] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("draft");
  const [tags, setTags] = useState<string[]>([]);
  const [summary, setSummary] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleOk = async () => {
    try {
      // 确保编辑器内容同步到表单
      form.setFieldsValue({ content: articleText });

      // 验证表单
      await form.validateFields();

      // 额外检查编辑器内容
      if (!articleText || articleText.trim() === '' || articleText === '<p><br></p>') {
        console.error('文章内容不能为空');
        return;
      }

      setConfirmLoading(true);

      // 使用统一的保存接口
      const data = await saveArticle({
        id: props.editData?.id,
        title: articleTitle,
        author: "admin",
        category: category,
        content: articleText,
        summary: summary,
        status: status,
        tags: tags,
      });

      if (data.code === 200) {
        const successMessage = props.editData ? "更新成功" : "创建成功";
        props.onSave(successMessage);
        handleCancel();
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setArticleText("");
    setArticleTitle("");
    setCategory("");
    setStatus("draft");
    setTags([]);
    setSummary("");
    props.onCancel();
  };

  const onEditorChange = (value: string) => {
    setArticleText(value);
    // 同步更新表单字段值
    form.setFieldsValue({ content: value });
  };

  const handlePreview = () => {
    // 检查是否有内容可以预览
    if (!articleTitle.trim()) {
      message.warning('请先输入文章标题');
      return;
    }
    if (!articleText || articleText.trim() === '' || articleText === '<p><br></p>') {
      message.warning('请先输入文章内容');
      return;
    }

    setPreviewOpen(true);
  };

  const handlePreviewClose = () => {
    setPreviewOpen(false);
  };

  useEffect(() => {
    if (props.editData) {
      setArticleTitle(props.editData.title || "");
      setArticleText(props.editData.content || "");
      setCategory(props.editData.category || "");
      setStatus(props.editData.status || "draft");
      setTags(props.editData.tags || []);
      setSummary(props.editData.summary || "");

      // 设置表单值
      form.setFieldsValue({
        title: props.editData.title,
        category: props.editData.category,
        status: props.editData.status || "draft",
        tags: props.editData.tags || [],
        content: props.editData.content || "",
        summary: props.editData.summary || "",
      });
    } else {
      // 新建文章时重置表单
      form.resetFields();
      setArticleText("");
      setArticleTitle("");
      setCategory("");
      setStatus("draft");
      setTags([]);
      setSummary("");

      // 设置默认表单值
      form.setFieldsValue({
        title: "",
        category: "",
        status: "draft",
        tags: [],
        content: "",
        summary: "",
      });
    }
  }, [props.editData, props.open, form]);

  return (
    <Modal
      title={
        <div className="modal-title">
          <SaveOutlined className="title-icon" />
          <span>{props.editData ? '编辑文章' : '创建文章'}</span>
        </div>
      }
      width={1200}
      open={props.open}
      onCancel={handleCancel}
      confirmLoading={confirmLoading}
      className="article-modal"
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button key="preview" icon={<EyeOutlined />} onClick={handlePreview}>
          预览
        </Button>,
        <Button
          key="save"
          type="primary"
          loading={confirmLoading}
          onClick={handleOk}
          icon={<SaveOutlined />}
        >
          {props.editData ? '更新文章' : '发布文章'}
        </Button>,
      ]}
    >
      <div className="article-form">
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: 'draft',
            category: '',
            tags: [],
          }}
        >
          <div className="form-row">
            <div className="form-col-8">
              <Form.Item
                label="文章标题"
                name="title"
                rules={[{ required: true, message: '请输入文章标题' }]}
              >
                <Input
                  placeholder="请输入文章标题"
                  value={articleTitle}
                  onChange={(e) => {
                    setArticleTitle(e.target.value);
                    form.setFieldsValue({ title: e.target.value });
                  }}
                  size="large"
                />
              </Form.Item>
            </div>
            <div className="form-col-4">
              <Form.Item
                label="发布状态"
                name="status"
              >
                <Select
                  value={status}
                  onChange={setStatus}
                  size="large"
                >
                  <Option value="draft">
                    <Tag color="orange">草稿</Tag>
                  </Option>
                  <Option value="published">
                    <Tag color="green">已发布</Tag>
                  </Option>
                  <Option value="archived">
                    <Tag color="gray">已归档</Tag>
                  </Option>
                </Select>
              </Form.Item>
            </div>
          </div>

          <div className="form-row">
            <div className="form-col-6">
              <Form.Item
                label="文章分类"
                name="category"
              >
                <Select
                  placeholder="选择文章分类"
                  value={category}
                  onChange={setCategory}
                  size="large"
                  allowClear
                >
                  <Option value="技术">技术</Option>
                  <Option value="生活">生活</Option>
                  <Option value="随笔">随笔</Option>
                  <Option value="教程">教程</Option>
                  <Option value="其他">其他</Option>
                </Select>
              </Form.Item>
            </div>
            <div className="form-col-6">
              <Form.Item
                label="文章标签"
                name="tags"
              >
                <Select
                  mode="tags"
                  placeholder="添加标签"
                  value={tags}
                  onChange={setTags}
                  size="large"
                  tokenSeparators={[',']}
                >
                  <Option value="React">React</Option>
                  <Option value="Vue">Vue</Option>
                  <Option value="JavaScript">JavaScript</Option>
                  <Option value="TypeScript">TypeScript</Option>
                  <Option value="Node.js">Node.js</Option>
                </Select>
              </Form.Item>
            </div>
          </div>

          <Form.Item
            label="文章摘要"
            name="summary"
          >
            <TextArea
              placeholder="请输入文章摘要（可选）"
              value={summary}
              onChange={(e) => {
                setSummary(e.target.value);
                form.setFieldsValue({ summary: e.target.value });
              }}
              rows={3}
              showCount
              maxLength={200}
            />
          </Form.Item>

          <Form.Item
            label="文章内容"
            name="content"
            rules={[
              { required: true, message: '请输入文章内容' },
              {
                validator: () => {
                  // 检查编辑器实际内容
                  if (!articleText || articleText.trim() === '' || articleText === '<p><br></p>') {
                    return Promise.reject(new Error('请输入文章内容'));
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <div className="editor-container">
              <ReactQuillEditor value={articleText} onChange={onEditorChange} />
            </div>
          </Form.Item>
        </Form>
      </div>

      <ArticlePreviewModal
        open={previewOpen}
        articleData={{
          title: articleTitle,
          content: articleText,
          author: "admin",
          category: category,
          status: status,
          tags: tags,
          summary: summary,
        }}
        onClose={handlePreviewClose}
      />
    </Modal>
  );
};

export default App;
