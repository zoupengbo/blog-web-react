import { Modal, Form, Input, InputNumber, Select, message } from 'antd';
import { TagOutlined } from '@ant-design/icons';
import React, { useEffect, useState } from 'react';
import { createTag, updateTag, Tag } from '@common/tagApi';

const { Option } = Select;
const { TextArea } = Input;

interface TagModalProps {
  open: boolean;
  editData: Tag | null;
  onCancel: () => void;
  onSave: (msg: string) => void;
}

const TAG_COLORS = [
  { value: 'blue', label: '蓝色' },
  { value: 'green', label: '绿色' },
  { value: 'red', label: '红色' },
  { value: 'orange', label: '橙色' },
  { value: 'purple', label: '紫色' },
  { value: 'cyan', label: '青色' },
  { value: 'magenta', label: '品红' },
  { value: 'volcano', label: '火山' },
  { value: 'gold', label: '金色' },
  { value: 'lime', label: '青柠' },
  { value: 'geekblue', label: '极客蓝' },
];

const TagModal: React.FC<TagModalProps> = (props) => {
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleOk = async () => {
    try {
      await form.validateFields();
      setConfirmLoading(true);

      const values = form.getFieldsValue();
      const data = {
        ...values,
        id: props.editData?.id,
      };

      let result;
      if (props.editData) {
        result = await updateTag(data);
      } else {
        result = await createTag(data);
      }

      if (result.code === 200) {
        const successMessage = props.editData ? '更新成功' : '创建成功';
        props.onSave(successMessage);
        handleCancel();
      } else {
        message.error(result.msg || '操作失败');
      }
    } catch (error: any) {
      console.error('表单验证失败:', error);
      if (error?.response?.data?.msg) {
        message.error(error.response.data.msg);
      }
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    props.onCancel();
  };

  useEffect(() => {
    if (props.editData) {
      form.setFieldsValue({
        name: props.editData.name,
        color: props.editData.color || 'blue',
        description: props.editData.description || '',
        sort: props.editData.sort || 0,
        status: props.editData.status || 'active',
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        name: '',
        color: 'blue',
        description: '',
        sort: 0,
        status: 'active',
      });
    }
  }, [props.editData, props.open, form]);

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TagOutlined style={{ color: '#1890ff' }} />
          <span>{props.editData ? '编辑标签' : '创建标签'}</span>
        </div>
      }
      open={props.open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={confirmLoading}
      okText={props.editData ? '更新' : '创建'}
      cancelText="取消"
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          color: 'blue',
          status: 'active',
          sort: 0,
        }}
      >
        <Form.Item
          label="标签名称"
          name="name"
          rules={[
            { required: true, message: '请输入标签名称' },
            { max: 50, message: '标签名称不能超过50个字符' },
          ]}
        >
          <Input placeholder="请输入标签名称" />
        </Form.Item>

        <Form.Item
          label="标签颜色"
          name="color"
          rules={[{ required: true, message: '请选择标签颜色' }]}
        >
          <Select placeholder="选择标签颜色">
            {TAG_COLORS.map(color => (
              <Option key={color.value} value={color.value}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '2px',
                      backgroundColor: color.value,
                      border: '1px solid #d9d9d9',
                    }}
                  />
                  <span>{color.label}</span>
                </div>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="标签描述"
          name="description"
          rules={[{ max: 200, message: '描述不能超过200个字符' }]}
        >
          <TextArea
            placeholder="请输入标签描述（可选）"
            rows={3}
            showCount
            maxLength={200}
          />
        </Form.Item>

        <Form.Item
          label="排序"
          name="sort"
          rules={[{ required: true, message: '请输入排序值' }]}
        >
          <InputNumber
            min={0}
            max={9999}
            placeholder="数字越小越靠前"
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item
          label="状态"
          name="status"
          rules={[{ required: true, message: '请选择状态' }]}
        >
          <Select>
            <Option value="active">启用</Option>
            <Option value="inactive">禁用</Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TagModal;

