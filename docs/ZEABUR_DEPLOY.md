# Zeabur 部署指南

## 为什么选择 Zeabur

- 国内可直接访问，无需 VPN
- 与 GitHub 集成，推送自动部署
- 有国内服务器节点（延迟低）
- 免费额度充足，适合中小项目

## 部署步骤

### 步骤 1：注册 Zeabur

访问 https://zeabur.com ，使用 GitHub 账号登录

### 步骤 2：创建项目

1. 点击 **New Project**
2. 选择 **Import from GitHub**
3. 授权 GitHub 访问
4. 选择仓库：`weikangceng7-ai/TrustWise-Pricing`
5. 框架会自动识别为 **Next.js**

### 步骤 3：添加数据库

1. 在项目中点击 **Add Service**
2. 选择 **Database** → **PostgreSQL**
3. 数据库会自动创建并生成连接字符串

### 步骤 4：配置环境变量

在 Web 服务的 **Environment Variables** 中添加：

```
BETTER_AUTH_URL=${ZEABUR_WEB_URL}
NEXT_PUBLIC_APP_URL=${ZEABUR_WEB_URL}
OPENAI_API_KEY=你的密钥
```

> 注意：`DATABASE_URL` 会自动从 PostgreSQL 服务注入

### 步骤 5：部署

点击 **Deploy** 按钮，首次部署约 2-3 分钟

### 步骤 6：绑定域名

1. 部署成功后，在 **Domains** 中添加自定义域名
2. 或使用 Zeabur 提供的免费域名 `xxx.zeabur.app`

---

## 环境变量说明

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `DATABASE_URL` | ✅ | 自动从 PostgreSQL 注入 |
| `BETTER_AUTH_URL` | ✅ | 设置为 `${ZEABUR_WEB_URL}` |
| `NEXT_PUBLIC_APP_URL` | ✅ | 设置为 `${ZEABUR_WEB_URL}` |
| `OPENAI_API_KEY` | ⬜ | AI API 密钥（或用 OPENROUTER_API_KEY） |

---

## 自动部署流程

配置完成后：

```
本地修改 → git push origin master → Zeabur 自动构建 → 自动部署
```

无需手动操作，推送代码即可。

---

## 注意事项

1. **首次部署** 需要等待依赖安装，可能较慢
2. **数据库迁移** 需要在部署后运行 `db:push`（通过 Zeabur 终端）
3. **免费额度** 每月 $5 免费额度，足够中小项目使用

---

## 问题排查

如果部署失败，检查：
1. 环境变量是否正确配置
2. GitHub 仓库是否可访问
3. 查看 Deploy Logs 获取详细错误信息