FROM node:22-slim

WORKDIR /app

# 安装依赖（使用 mcp-server 独立的 package.json）
COPY mcp-server/package.json ./package.json
RUN npm install --production --omit=dev --ignore-scripts

# 复制完整 mcp-server 目录
COPY mcp-server/ ./

EXPOSE 3100

ENV NODE_ENV=production
ENV MCP_TRANSPORT=http
ENV MCP_PORT=3100

CMD ["npx", "tsx", "index.ts"]
