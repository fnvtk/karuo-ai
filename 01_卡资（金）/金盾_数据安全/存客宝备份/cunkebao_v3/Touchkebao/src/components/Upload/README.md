# Upload 组件使用说明

## 组件概述

本项目提供了多个专门的上传组件，所有组件都支持编辑时的数据回显功能，确保在编辑模式下能够正确显示已上传的文件。

## 组件列表

### 1. MainImgUpload 主图封面上传组件

#### 功能特点

- 只支持上传一张图片作为主图封面
- 上传后右上角显示删除按钮
- 支持图片预览功能
- 响应式设计，适配移动端
- 16:9宽高比，宽度高度自适应
- **支持数据回显**：编辑时自动显示已上传的图片

#### 使用方法

```tsx
import MainImgUpload from "@/components/Upload/MainImgUpload";

const MyComponent = () => {
  const [mainImage, setMainImage] = useState<string>("");

  return (
    <MainImgUpload
      value={mainImage}
      onChange={setMainImage}
      maxSize={5} // 最大5MB
      showPreview={true} // 显示预览按钮
      disabled={false}
    />
  );
};
```

#### 编辑模式数据回显

```tsx
// 编辑模式下，传入已有的图片URL
const [mainImage, setMainImage] = useState<string>(
  "https://example.com/image.jpg",
);

<MainImgUpload
  value={mainImage} // 会自动显示已上传的图片
  onChange={setMainImage}
/>;
```

### 2. ImageUpload 多图上传组件

#### 功能特点

- 支持多张图片上传
- 可设置最大上传数量
- 支持图片预览和删除
- **支持数据回显**：编辑时自动显示已上传的图片数组

#### 使用方法

```tsx
import ImageUpload from "@/components/Upload/ImageUpload/ImageUpload";

const MyComponent = () => {
  const [images, setImages] = useState<string[]>([]);

  return (
    <ImageUpload
      value={images}
      onChange={setImages}
      count={9} // 最大9张
      accept="image/*"
    />
  );
};
```

#### 编辑模式数据回显

```tsx
// 编辑模式下，传入已有的图片URL数组
const [images, setImages] = useState<string[]>([
  "https://example.com/image1.jpg",
  "https://example.com/image2.jpg",
]);

<ImageUpload
  value={images} // 会自动显示已上传的图片
  onChange={setImages}
/>;
```

### 3. VideoUpload 视频上传组件

#### 功能特点

- 支持视频文件上传
- 支持单个或多个视频
- 视频预览功能
- 文件大小验证
- **支持数据回显**：编辑时自动显示已上传的视频

#### 使用方法

```tsx
import VideoUpload from "@/components/Upload/VideoUpload";

const MyComponent = () => {
  const [videoUrl, setVideoUrl] = useState<string>("");

  return (
    <VideoUpload
      value={videoUrl}
      onChange={setVideoUrl}
      maxSize={50} // 最大50MB
      showPreview={true}
    />
  );
};
```

#### 编辑模式数据回显

```tsx
// 编辑模式下，传入已有的视频URL
const [videoUrl, setVideoUrl] = useState<string>(
  "https://example.com/video.mp4",
);

<VideoUpload
  value={videoUrl} // 会自动显示已上传的视频
  onChange={setVideoUrl}
/>;
```

### 4. FileUpload 文件上传组件

#### 功能特点

- 支持Excel、Word、PPT等文档文件
- 可配置接受的文件类型
- 文件预览和下载
- **支持数据回显**：编辑时自动显示已上传的文件

#### 使用方法

```tsx
import FileUpload from "@/components/Upload/FileUpload";

const MyComponent = () => {
  const [fileUrl, setFileUrl] = useState<string>("");

  return (
    <FileUpload
      value={fileUrl}
      onChange={setFileUrl}
      maxSize={10} // 最大10MB
      acceptTypes={["excel", "word", "ppt"]}
    />
  );
};
```

#### 编辑模式数据回显

```tsx
// 编辑模式下，传入已有的文件URL
const [fileUrl, setFileUrl] = useState<string>(
  "https://example.com/document.xlsx",
);

<FileUpload
  value={fileUrl} // 会自动显示已上传的文件
  onChange={setFileUrl}
/>;
```

### 5. AvatarUpload 头像上传组件

#### 功能特点

- 专门的头像上传组件
- 圆形头像显示
- 支持删除和重新上传
- **支持数据回显**：编辑时自动显示已上传的头像

#### 使用方法

```tsx
import AvatarUpload from "@/components/Upload/AvatarUpload";

const MyComponent = () => {
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  return (
    <AvatarUpload
      value={avatarUrl}
      onChange={setAvatarUrl}
      size={100} // 头像尺寸
    />
  );
};
```

#### 编辑模式数据回显

```tsx
// 编辑模式下，传入已有的头像URL
const [avatarUrl, setAvatarUrl] = useState<string>(
  "https://example.com/avatar.jpg",
);

<AvatarUpload
  value={avatarUrl} // 会自动显示已上传的头像
  onChange={setAvatarUrl}
/>;
```

### 6. ChatFileUpload 聊天文件上传组件

#### 功能特点

- 专门为聊天场景设计的文件上传组件
- 点击按钮直接唤醒文件选择框
- 选择文件后自动上传
- 上传成功后自动发送到聊天框
- 支持各种文件类型和大小限制
- 显示文件图标和大小信息
- 支持自定义按钮文本和图标

#### 使用方法

```tsx
import ChatFileUpload from "@/components/Upload/ChatFileUpload";

const ChatComponent = () => {
  const handleFileUploaded = (fileInfo: {
    url: string;
    name: string;
    type: string;
    size: number;
  }) => {
    // 处理上传成功的文件
    console.log("文件上传成功:", fileInfo);
    // 发送到聊天框
    sendMessage({
      type: "file",
      content: fileInfo,
    });
  };

  return (
    <ChatFileUpload
      onFileUploaded={handleFileUploaded}
      maxSize={50} // 最大50MB
      accept="*/*" // 接受所有文件类型
      buttonText="发送文件"
      buttonIcon={<span>📎</span>}
    />
  );
};
```

#### 不同文件类型的配置示例

```tsx
// 图片上传
<ChatFileUpload
  onFileUploaded={handleFileUploaded}
  maxSize={10}
  accept="image/*"
  buttonText="图片"
  buttonIcon={<span>🖼️</span>}
/>

// 文档上传
<ChatFileUpload
  onFileUploaded={handleFileUploaded}
  maxSize={20}
  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
  buttonText="文档"
  buttonIcon={<span>📄</span>}
/>

// 视频上传
<ChatFileUpload
  onFileUploaded={handleFileUploaded}
  maxSize={100}
  accept="video/*"
  buttonText="视频"
  buttonIcon={<span>🎥</span>}
/>
```

#### 在聊天界面中的完整使用示例

```tsx
import React, { useState } from "react";
import { Input, Button } from "antd";
import ChatFileUpload from "@/components/Upload/ChatFileUpload";

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");

  const handleFileUploaded = fileInfo => {
    const newMessage = {
      id: Date.now(),
      type: "file",
      content: fileInfo,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendText = () => {
    if (!inputValue.trim()) return;

    const newMessage = {
      id: Date.now(),
      type: "text",
      content: inputValue,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    setInputValue("");
  };

  return (
    <div>
      {/* 聊天消息区域 */}
      <div className="chat-messages">
        {messages.map(msg => (
          <div key={msg.id} className="message">
            {msg.type === "file" ? (
              <div>
                <div>📎 {msg.content.name}</div>
                <div>大小: {formatFileSize(msg.content.size)}</div>
                <a href={msg.content.url} target="_blank">
                  查看文件
                </a>
              </div>
            ) : (
              <div>{msg.content}</div>
            )}
          </div>
        ))}
      </div>

      {/* 输入区域 */}
      <div className="chat-input">
        <Input.TextArea
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="输入消息..."
        />
        <div className="input-actions">
          <ChatFileUpload
            onFileUploaded={handleFileUploaded}
            maxSize={50}
            accept="*/*"
            buttonText="文件"
          />
          <Button onClick={handleSendText}>发送</Button>
        </div>
      </div>
    </div>
  );
};
```

## 数据回显机制

### 工作原理

所有Upload组件都通过以下机制实现数据回显：

1. **useEffect监听value变化**：当传入的value发生变化时，自动更新内部状态
2. **文件列表同步**：将URL转换为文件列表格式，显示已上传的文件
3. **状态管理**：维护上传状态、文件列表等内部状态
4. **UI更新**：根据文件列表自动更新界面显示

### 使用场景

- **新增模式**：value为空或未定义，显示上传按钮
- **编辑模式**：value包含已上传文件的URL，自动显示文件
- **混合模式**：支持部分文件已上传，部分文件待上传

### 注意事项

1. **URL格式**：确保传入的URL是有效的文件访问地址
2. **权限验证**：确保文件URL在编辑时仍然可访问
3. **状态同步**：value和onChange需要正确配合使用
4. **错误处理**：组件会自动处理无效URL的显示

## 技术实现

### 核心特性

- 基于 antd Upload 组件
- 使用 antd-mobile 的 Toast 提示
- 支持 FormData 上传
- 自动处理文件验证和错误提示
- 集成项目统一的API请求封装
- **完整的数据回显支持**

### 文件结构

```
src/components/Upload/
├── MainImgUpload/          # 主图上传组件
├── ImageUpload/            # 多图上传组件
├── VideoUpload/            # 视频上传组件
├── FileUpload/             # 文件上传组件
├── AvatarUpload/           # 头像上传组件
├── ChatFileUpload/         # 聊天文件上传组件
│   ├── index.tsx           # 主组件文件
│   ├── index.module.scss   # 样式文件
│   └── example.tsx         # 使用示例
└── README.md               # 使用说明文档
```

### 统一的数据回显模式

所有组件都遵循相同的数据回显模式：

```tsx
// 1. 接收value属性
interface Props {
  value?: string | string[];
  onChange?: (url: string | string[]) => void;
}

// 2. 使用useEffect监听value变化
useEffect(() => {
  if (value) {
    // 将URL转换为文件列表格式
    const files = convertUrlToFileList(value);
    setFileList(files);
  } else {
    setFileList([]);
  }
}, [value]);

// 3. 在UI中显示文件列表
// 4. 支持编辑、删除、预览等操作
```
