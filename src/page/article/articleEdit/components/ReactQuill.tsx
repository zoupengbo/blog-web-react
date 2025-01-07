import { useEffect, useState } from "react";
import ReactQuill from "react-quill";

interface ReactQuillProps {
  value: string;
  onChange: (value: string) => void
}
const ReactQuillEditor:React.FC<ReactQuillProps> = ({value,onChange}) => {
  const [editValue, setEditValue] = useState<string>("");

  useEffect(() => {
    setEditValue(value)
  })
  return (
    <div className="react-quill-wrap">
      <h2 className="title">富文本编辑器</h2>
      <div className="quill-editor-wrap">
        <ReactQuill theme="snow" value={editValue} style={{ height: "600px",marginBottom: "60px"}} onChange={onChange} />
      </div>
    </div>
  );
};

export default ReactQuillEditor;
