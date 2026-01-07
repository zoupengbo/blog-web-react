import { Modal, Form, Input, InputNumber, Select, message } from 'antd';
import { FolderOutlined } from '@ant-design/icons';
import React, { useEffect, useState } from 'react';
import { createCategory, updateCategory, Category } from '@common/categoryApi';

const { Option } = Select;
const { TextArea } = Input;

interface CategoryModalProps {
  open: boolean;
  editData: Category | null;
  onCancel: () => void;
  onSave: (msg: string) => void;
}

const CategoryModal: React.FC<CategoryModalProps> = (props) => {
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
        result = await updateCategory(data);
      } else {
        result = await createCategory(data);
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
        description: props.editData.description || '',
        sort: props.editData.sort || 0,
        status: props.editData.status || 'active',
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        name: '',
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
          <FolderOutlined style={{ color: '#1890ff' }} />
          <span>{props.editData ? '编辑分类' : '创建分类'}</span>
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
          status: 'active',
          sort: 0,
        }}
      >
        <Form.Item
          label="分类名称"
          name="name"
          rules={[
            { required: true, message: '请输入分类名称' },
            { max: 50, message: '分类名称不能超过50个字符' },
          ]}
        >
          <Input placeholder="请输入分类名称" />
        </Form.Item>

        <Form.Item
          label="分类描述"
          name="description"
          rules={[{ max: 200, message: '描述不能超过200个字符' }]}
        >
          <TextArea
            placeholder="请输入分类描述（可选）"
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

export default CategoryModal;

