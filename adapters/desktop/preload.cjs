;(() => {
  const { contextBridge, ipcRenderer } = require('electron');
  contextBridge.exposeInMainWorld('codexTokenInline', Object.freeze({
    snapshot: ({ threadId, turnId, messageId, sentAtMs }) => ipcRenderer.invoke('codex-token-inline:snapshot:v1', { threadId, turnId, messageId, sentAtMs }),
    report: data => ipcRenderer.invoke('codex-token-inline:diagnostic:v1', data),
  }));
})();
