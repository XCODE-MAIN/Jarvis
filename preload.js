const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('jarvis', {
  getConfig: () => ipcRenderer.invoke('cfg:get'),
  setConfig: (cfg) => ipcRenderer.invoke('cfg:set', cfg),
  chat: (history) => ipcRenderer.invoke('chat', history),
  transcribe: (buf) => ipcRenderer.invoke('stt', buf),
  onTool: (cb) => ipcRenderer.on('tool:event', (_e, data) => cb(data)),
  minimize: () => ipcRenderer.send('win:min'),
  close: () => ipcRenderer.send('win:close')
});
