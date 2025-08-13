import { useEffect, useState, useMemo } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

interface ReactQuillProps {
  value: string;
  onChange: (value: string) => void
}

const ReactQuillEditor: React.FC<ReactQuillProps> = ({ value, onChange }) => {
  const [editValue, setEditValue] = useState<string>("");

  // 配置工具栏和模块，支持中文输入
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'script': 'sub' }, { 'script': 'super' }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }],
      [{ 'align': [] }],
      ['link', 'image', 'video'],
      ['blockquote', 'code-block'],
      ['clean']
    ],
    clipboard: {
      matchVisual: false,
    },
    keyboard: {
      bindings: {
        // 支持中文输入法
        tab: {
          key: 9,
          handler: function() {
            return true;
          }
        }
      }
    }
  }), []);

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'script',
    'list', 'bullet', 'indent',
    'direction', 'align',
    'link', 'image', 'video',
    'blockquote', 'code-block'
  ];

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleChange = (content: string, _delta: any, source: string) => {
    // 只有用户输入时才更新，避免程序设置时的冲突
    if (source === 'user') {
      setEditValue(content);
      onChange(content);
    } else if (source === 'api' && content !== editValue) {
      setEditValue(content);
    }
  };

  return (
    <div className="react-quill-wrap">
      <h2 className="title">文章正文</h2>
      <div className="quill-editor-wrap">
        <ReactQuill
          theme="snow"
          value={editValue}
          onChange={handleChange}
          modules={modules}
          formats={formats}
          style={{ height: "600px", marginBottom: "60px" }}
          placeholder="请输入文章内容..."
          preserveWhitespace={true}
        />
      </div>
    </div>
  );
};

export default ReactQuillEditor;
