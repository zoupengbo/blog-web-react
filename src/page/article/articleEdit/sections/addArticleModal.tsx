import { Modal, Input } from "antd";
import React, { useEffect, useState } from "react";
import ReactQuillEditor from "../components/ReactQuill";
import httpService from "../../../../common/request";
interface editData {
  title: string;
  content: string;
}
interface AppProps {
  open: boolean;
  editData: editData;
  onCancel: () => void;
  onSave: (data: String) => void;
}

const App: React.FC<AppProps> = (props) => {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [articleText, setArticleText] = useState("");
  const [articleTitle, setArticleTitle] = useState("");

  const handleOk = async () => {
    setConfirmLoading(true);
    const data = await httpService.post("/article", {
      title: articleTitle,
      author: "admin",
      category: articleText.substring(0, 10),
      content: articleText,
    });
    if (data.code === 200) {
      props.onSave("保存成功");
      props.onCancel();
    }
    setConfirmLoading(false);
  };

  const handleCancel = () => {
    props.onCancel();
  };

  const onEditorChange = (value: string) => {
    setArticleText(value);
  };

  useEffect(() => {
    if (props.editData){
      setArticleTitle(props.editData.title);
      setArticleText(props.editData.content);
    }
  })

  return (
    <>
      <Modal
        title="编辑文章"
        width={1000}
        open={props.open}
        onOk={handleOk}
        okText="保存"
        cancelText="取消"
        confirmLoading={confirmLoading}
        onCancel={handleCancel}
      >
        <Input
          placeholder="请输入文章标题"
          value={articleTitle}
          onChange={(e) => setArticleTitle(e.target.value)}
        />
        <ReactQuillEditor value={articleText} onChange={onEditorChange} />
      </Modal>
    </>
  );
};

export default App;
