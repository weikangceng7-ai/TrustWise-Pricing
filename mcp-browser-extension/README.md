# 硫磺市场数据助手 - 浏览器扩展

在 DeepSeek、豆包、ChatGPT 等 AI 聊天页面中，一键获取硫磺市场数据并注入到输入框。

## 安装

### Chrome / Edge（推荐）

1. 打开 `chrome://extensions/`（Edge: `edge://extensions/`）
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `mcp-browser-extension/` 目录
5. 扩展图标出现在浏览器工具栏

### 配置

1. 点击扩展图标打开设置页
2. 填写 **MCP Server 地址**：
   - 本地开发：`http://localhost:3100/mcp`
   - 已部署：`https://你的域名/mcp`
3. 保存

## 使用

1. 打开 DeepSeek / 豆包 / ChatGPT 等聊天页面
2. 点击右下角浮动按钮
3. 侧边面板自动获取硫磺市场数据（价格、库存、新闻）
4. 点击「注入到输入框」将数据追加到聊天输入框
5. 在 AI 回复中看到带市场数据的回答

## 文件结构

```
mcp-browser-extension/
├── manifest.json     # Chrome Manifest V3 配置
├── content.js        # 内容脚本，MCP 通信 + 数据注入
├── content.css       # 面板样式
├── popup.html        # 设置页面
├── popup.js          # 设置页面逻辑
└── icons/
    └── icon*.png     # 扩展图标