import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';

// 测试组件，用于验证表单同步逻辑
const FormValidationTest: React.FC = () => {
  const [form] = Form.useForm();
  const [editorContent, setEditorContent] = useState('');

  const handleEditorChange = (value: string) => {
    console.log('编辑器内容变化:', value);
    setEditorContent(value);
    // 同步到表单
    form.setFieldsValue({ content: value });
  };

  const handleSubmit = async () => {
    try {
      // 确保最新内容同步到表单
      form.setFieldsValue({ content: editorContent });
      
      const values = await form.validateFields();
      console.log('表单验证通过:', values);
      message.success('验证通过！');
    } catch (error) {
      console.error('表单验证失败:', error);
      message.error('验证失败，请检查表单内容');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h3>表单验证测试</h3>
      <Form form={form} layout="vertical">
        <Form.Item
          label="标题"
          name="title"
          rules={[{ required: true, message: '请输入标题' }]}
        >
          <Input placeholder="请输入标题" />
        </Form.Item>

        <Form.Item
          label="内容"
          name="content"
          rules={[
            { required: true, message: '请输入内容' },
            {
              validator: () => {
                if (!editorContent || editorContent.trim() === '' || editorContent === '<p><br></p>') {
                  return Promise.reject(new Error('请输入内容'));
                }
                return Promise.resolve();
              }
            }
          ]}
        >
          <div style={{ border: '1px solid #d9d9d9', borderRadius: '6px', padding: '10px' }}>
            <textarea
              value={editorContent}
              onChange={(e) => handleEditorChange(e.target.value)}
              placeholder="请输入内容"
              style={{ width: '100%', minHeight: '100px', border: 'none', outline: 'none' }}
            />
          </div>
        </Form.Item>
      </Form>

      <div style={{ marginTop: '20px' }}>
        <Button type="primary" onClick={handleSubmit}>
          提交测试
        </Button>
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
          <p>编辑器内容: {editorContent || '(空)'}</p>
          <p>表单内容: {form.getFieldValue('content') || '(空)'}</p>
        </div>
      </div>
    </div>
  );
};

export default FormValidationTest;
