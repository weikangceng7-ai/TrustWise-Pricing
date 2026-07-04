/**
 * Content Script - 注入硫磺市场数据到 AI 聊天输入框
 *
 * 在 DeepSeek、豆包等 AI 聊天页面侧边添加一个浮动面板，
 * 点击后获取硫磺市场数据并注入到输入框。
 */

// 默认配置
const DEFAULT_CONFIG = {
  mcpUrl: "http://localhost:3100/mcp",
  apiKey: "",
  enabled: true,
  useDefaultServer: false,
};

// 全局状态
let config = { ...DEFAULT_CONFIG };
let sessionId = null;
let toolList = [];

/**
 * 从 storage 加载配置
 */
async function loadConfig() {
  try {
    const result = await chrome.storage.local.get("sulfurAgentConfig");
    if (result.sulfurAgentConfig) {
      config = { ...config, ...result.sulfurAgentConfig };
    }
  } catch (e) {
    console.warn("[Sulfur Agent] Failed to load config:", e);
  }
}

/**
 * MCP HTTP 请求封装
 */
async function mcpRequest(method, params = {}) {
  if (!config.mcpUrl || config.mcpUrl === "http://localhost:3100/mcp") {
    // 如果用户没配置 MCP URL，返回提示
    return { error: "请先在扩展设置中配置 MCP Server 地址" };
  }

  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
  };
  if (sessionId) {
    headers["Mcp-Session-Id"] = sessionId;
  }

  const res = await fetch(config.mcpUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    }),
  });

  // 保存 session ID
  const newSessionId = res.headers.get("Mcp-Session-Id");
  if (newSessionId) {
    sessionId = newSessionId;
  }

  // 解析 SSE 或 JSON
  const text = await res.text();
  if (text.startsWith("event:")) {
    // SSE 格式 - 提取 data 行
    const match = text.match(/data:\s*(\{.*\})/s);
    if (match) {
      return JSON.parse(match[1]);
    }
  }

  return JSON.parse(text);
}

/**
 * 初始化 MCP 连接
 */
async function initializeMcp() {
  if (sessionId) return true;

  const res = await mcpRequest("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "sulfur-browser-extension", version: "0.1.0" },
  });

  if (res.result) {
    console.log("[Sulfur Agent] MCP initialized:", res.result.serverInfo);
    return true;
  }
  return false;
}

/**
 * 获取工具列表
 */
async function listTools() {
  const res = await mcpRequest("tools/list");
  if (res.result?.tools) {
    toolList = res.result.tools;
    return toolList;
  }
  return [];
}

/**
 * 调用工具
 */
async function callTool(name, args) {
  const res = await mcpRequest("tools/call", {
    name,
    arguments: args,
  });
  return res;
}

/**
 * 快速获取硫磺数据
 */
async function fetchSulfurData() {
  const initialized = await initializeMcp();
  if (!initialized) return "MCP Server 连接失败，请检查设置";

  // 并行获取价格和库存
  const [prices, inventory, news] = await Promise.all([
    callTool("get_prices", { days: 7 }),
    callTool("get_inventory", { limit: 2 }),
    callTool("get_news", { limit: 5 }),
  ]);

  // 组装成 Markdown 文本
  let text = "## 硫磺市场数据\n\n";

  // 价格
  if (prices.result?.content?.[0]?.text) {
    text += "### 价格走势\n" + prices.result.content[0].text + "\n\n";
  } else {
    text += "### 价格走势：获取失败\n\n";
  }

  // 库存
  if (inventory.result?.content?.[0]?.text) {
    text += "### 港口库存\n" + inventory.result.content[0].text + "\n\n";
  }

  // 新闻
  if (news.result?.content?.[0]?.text) {
    text += "### 市场新闻\n" + news.result.content[0].text + "\n\n";
  }

  return text;
}

/**
 * 将文本注入到聊天输入框
 */
function injectToInput(text) {
  // 尝试常见的输入框选择器
  const selectors = [
    "textarea",
    "[contenteditable='true']",
    "input[type='text']",
    ".chat-input textarea",
    "#chat-input textarea",
    "div[role='textbox']",
    "div.ProseMirror",
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (!el) continue;

    // textarea 或 input
    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        "value"
      )?.set || Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set;

      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(el, text);
      } else {
        el.value = text;
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.focus();
      return true;
    }

    // contenteditable
    if (el.isContentEditable) {
      el.innerHTML = text.replace(/\n/g, "<br>");
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.focus();
      return true;
    }
  }

  return false;
}

/**
 * 创建侧边面板
 */
function createPanel() {
  if (document.getElementById("sulfur-agent-panel")) return;

  const panel = document.createElement("div");
  panel.id = "sulfur-agent-panel";
  panel.className = "sulfur-agent-panel";
  panel.innerHTML = `
    <div class="sa-panel-header">
      <span class="sa-panel-title">硫磺市场数据</span>
      <button class="sa-panel-close" id="sa-close-btn">&times;</button>
    </div>
    <div class="sa-panel-body">
      <div class="sa-loading" id="sa-loading">
        <div class="sa-spinner"></div>
        <span>正在获取数据...</span>
      </div>
      <div class="sa-content" id="sa-content" style="display:none;">
        <pre id="sa-data"></pre>
        <div class="sa-actions">
          <button class="sa-btn" id="sa-inject-btn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 8h12M9 3l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            注入到输入框
          </button>
          <button class="sa-btn" id="sa-copy-btn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="5" y="5" width="9" height="9" rx="1" stroke="currentColor" stroke-width="1.5"/>
              <path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v7A1.5 1.5 0 003.5 12H5" stroke="currentColor" stroke-width="1.5"/>
            </svg>
            复制
          </button>
          <button class="sa-btn" id="sa-refresh-btn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M1 2v4h4M15 14v-4h-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M13.7 7.3A6 6 0 118.7 2.3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            刷新
          </button>
        </div>
      </div>
      <div class="sa-error" id="sa-error" style="display:none;"></div>
    </div>
  `;

  document.body.appendChild(panel);

  // 关闭按钮
  document.getElementById("sa-close-btn").addEventListener("click", () => {
    panel.classList.add("sa-hidden");
  });

  // 注入按钮
  document.getElementById("sa-inject-btn").addEventListener("click", async () => {
    const data = document.getElementById("sa-data").textContent;
    const success = injectToInput(data);
    if (success) {
      document.getElementById("sa-inject-btn").textContent = "已注入";
      setTimeout(() => {
        document.getElementById("sa-inject-btn").innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 8h12M9 3l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            注入到输入框`;
      }, 2000);
    } else {
      showError("未找到输入框");
    }
  });

  // 复制按钮
  document.getElementById("sa-copy-btn").addEventListener("click", () => {
    const data = document.getElementById("sa-data").textContent;
    navigator.clipboard.writeText(data).then(() => {
      document.getElementById("sa-copy-btn").textContent = "已复制";
      setTimeout(() => {
        document.getElementById("sa-copy-btn").innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="5" y="5" width="9" height="9" rx="1" stroke="currentColor" stroke-width="1.5"/>
              <path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v7A1.5 1.5 0 003.5 12H5" stroke="currentColor" stroke-width="1.5"/>
            </svg>
            复制`;
      }, 2000);
    });
  });

  // 刷新按钮
  document.getElementById("sa-refresh-btn").addEventListener("click", loadData);

  // 自动加载数据
  loadData();
}

function showError(msg) {
  document.getElementById("sa-loading").style.display = "none";
  document.getElementById("sa-content").style.display = "none";
  const errorEl = document.getElementById("sa-error");
  errorEl.textContent = msg;
  errorEl.style.display = "block";
}

async function loadData() {
  document.getElementById("sa-loading").style.display = "flex";
  document.getElementById("sa-content").style.display = "none";
  document.getElementById("sa-error").style.display = "none";

  if (!config.enabled) {
    showError("扩展已禁用，请在设置中启用");
    return;
  }

  try {
    const data = await fetchSulfurData();

    document.getElementById("sa-loading").style.display = "none";

    if (data.startsWith("## 硫磺市场数据")) {
      document.getElementById("sa-data").textContent = data;
      document.getElementById("sa-content").style.display = "block";
    } else {
      showError(data);
    }
  } catch (e) {
    showError("数据获取失败：" + e.message);
  }
}

/**
 * 浮动按钮 - 在页面右下角添加一个按钮
 */
function createFloatingButton() {
  if (document.getElementById("sulfur-agent-float-btn")) return;

  const btn = document.createElement("button");
  btn.id = "sulfur-agent-float-btn";
  btn.className = "sa-float-btn";
  btn.title = "硫磺市场数据助手";
  btn.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  btn.addEventListener("click", () => {
    const panel = document.getElementById("sulfur-agent-panel");
    if (panel) {
      panel.classList.toggle("sa-hidden");
    } else {
      createPanel();
    }
  });

  document.body.appendChild(btn);
}

/**
 * 初始化
 */
async function init() {
  await loadConfig();
  if (!config.enabled) return;

  // 延迟执行，等待页面 DOM 完全加载
  setTimeout(() => {
    createFloatingButton();
  }, 2000);
}

init();
