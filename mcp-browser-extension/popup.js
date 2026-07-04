/**
 * Popup 页面逻辑
 */
document.addEventListener("DOMContentLoaded", async () => {
  const enabledToggle = document.getElementById("enabled-toggle");
  const defaultServerToggle = document.getElementById("default-server-toggle");
  const mcpUrlInput = document.getElementById("mcp-url-input");
  const mcpUrlGroup = mcpUrlInput.closest(".setting-group");
  const apiKeyInput = document.getElementById("api-key-input");
  const saveBtn = document.getElementById("save-btn");
  const statusEl = document.getElementById("status");

  const DEFAULT_MCP_URL = "https://sulfur-agent-web.vercel.app/mcp";

  // 加载配置
  const { sulfurAgentConfig } = await chrome.storage.local.get("sulfurAgentConfig");
  if (sulfurAgentConfig) {
    enabledToggle.checked = sulfurAgentConfig.enabled ?? true;
    defaultServerToggle.checked = sulfurAgentConfig.useDefaultServer ?? false;
    if (sulfurAgentConfig.useDefaultServer) {
      mcpUrlInput.value = DEFAULT_MCP_URL;
      mcpUrlInput.disabled = true;
    } else {
      mcpUrlInput.value = sulfurAgentConfig.mcpUrl || "";
    }
    apiKeyInput.value = sulfurAgentConfig.apiKey || "";
  }

  // 默认服务器切换
  defaultServerToggle.addEventListener("change", () => {
    if (defaultServerToggle.checked) {
      mcpUrlInput.value = DEFAULT_MCP_URL;
      mcpUrlInput.disabled = true;
    } else {
      mcpUrlInput.value = "";
      mcpUrlInput.disabled = false;
    }
  });

  // 保存配置
  saveBtn.addEventListener("click", async () => {
    const config = {
      enabled: enabledToggle.checked,
      useDefaultServer: defaultServerToggle.checked,
      mcpUrl: defaultServerToggle.checked ? DEFAULT_MCP_URL : mcpUrlInput.value.trim(),
      apiKey: apiKeyInput.value.trim(),
    };

    await chrome.storage.local.set({ sulfurAgentConfig: config });

    // 显示状态
    statusEl.style.display = "block";
    statusEl.className = "status ok";
    statusEl.textContent = "已保存！在聊天页面点击浮动按钮即可使用";

    setTimeout(() => {
      statusEl.style.display = "none";
    }, 3000);
  });
});
