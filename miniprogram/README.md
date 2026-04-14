# 硫磺价格预测与决策辅助系统 - 微信小程序

## 项目说明

本项目是硫磺价格预测与决策辅助系统的微信小程序版本，基于 uni-app 框架开发。

## 开发环境准备

### 1. 安装依赖

```bash
cd miniprogram
npm install
```

### 2. 配置 AppID

修改 `manifest.json` 文件中的 `mp-weixin.appid` 字段，填入你的微信小程序 AppID：

```json
{
  "mp-weixin": {
    "appid": "你的小程序AppID"
  }
}
```

### 3. 准备 TabBar 图标

在 `static/tabbar/` 目录下放置以下图标文件（建议尺寸 81x81 像素）：

- `home.png` / `home-active.png` - 首页图标
- `enterprise.png` / `enterprise-active.png` - 企业图标
- `report.png` / `report-active.png` - 报告图标
- `chat.png` / `chat-active.png` - 聊天图标
- `user.png` / `user-active.png` - 用户图标

### 4. 配置 API 地址

修改 `utils/api.js` 文件中的 `BASE_URL`：

```javascript
const BASE_URL = 'https://your-domain.com'  // 改为你的服务器地址
```

## 运行项目

### 开发模式

```bash
npm run dev:mp-weixin
```

然后使用微信开发者工具打开 `dist/dev/mp-weixin` 目录。

### 构建生产版本

```bash
npm run build:mp-weixin
```

构建产物在 `dist/build/mp-weixin` 目录。

## 项目结构

```
miniprogram/
├── pages/                  # 页面目录
│   ├── index/             # 首页
│   ├── enterprise/        # 企业相关页面
│   │   ├── list.vue       # 企业列表
│   │   └── detail.vue     # 企业详情
│   ├── reports/           # 报告页面
│   │   └── list.vue       # 报告列表
│   ├── chat/              # 聊天助手
│   │   └── index.vue      # 聊天页面
│   └── user/              # 用户中心
│       └── index.vue      # 用户页面
├── stores/                 # Pinia 状态管理
│   └── enterprise.js      # 企业状态
├── styles/                 # 样式文件
│   ├── common.css         # 通用样式
│   └── variables.css      # CSS 变量
├── utils/                  # 工具函数
│   └── api.js             # API 请求封装
├── static/                 # 静态资源
│   └── tabbar/            # TabBar 图标
├── App.vue                 # 应用入口
├── main.js                 # 入口文件
├── manifest.json           # 应用配置
├── pages.json              # 页面配置
├── package.json            # 依赖配置
└── vite.config.ts          # Vite 配置
```

## 功能模块

### 首页
- 系统概览
- 快捷功能入口
- 市场动态

### 企业服务
- 企业列表展示
- 企业详情查看
- 价格预测图表
- 库存信息展示

### 采购报告
- 报告列表
- 类型筛选
- 日期筛选

### AI 助手
- 智能对话
- 快捷问题
- 价格咨询

### 用户中心
- 个人信息
- 系统设置
- 缓存管理

## 注意事项

1. 小程序需要配置合法域名，请在微信公众平台后台添加服务器域名
2. 部分功能需要用户授权，请确保已配置相关权限
3. 生产环境请使用 HTTPS 协议

## 与 Web 版的区别

- 简化了部分复杂图表，使用更适合移动端的展示方式
- 优化了触摸交互体验
- 适配了小程序的安全限制
- 使用 TabBar 替代侧边栏导航
