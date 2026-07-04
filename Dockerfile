FROM node:22-slim AS builder

WORKDIR /app

# 安装 mcp-server 全部依赖（含 dev，用于编译）
COPY mcp-server/package.json ./package.json
RUN npm install

# 复制源码并编译
COPY mcp-server/ ./
COPY mcp-server/tsconfig.json ./tsconfig.json
RUN npm run build

FROM node:22-slim AS runtime

WORKDIR /app

# 仅安装生产依赖
COPY mcp-server/package.json ./package.json
RUN npm install --production --ignore-scripts

# 复制编译产物
COPY --from=builder /app/dist ./dist

EXPOSE 3100

ENV NODE_ENV=production
ENV MCP_TRANSPORT=http
ENV MCP_PORT=3100

CMD ["node", "dist/index.js"]

