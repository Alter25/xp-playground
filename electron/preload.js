import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('xp', {
  platform:       process.platform,
  runCode:        (code, language)    => ipcRenderer.invoke('run-code', { code, language }),
  transformJSX:   (code, language)    => ipcRenderer.invoke('transform-jsx', { code, language }),
  getPlugins:     ()                  => ipcRenderer.invoke('get-plugins'),
  openPluginsDir: ()                  => ipcRenderer.invoke('open-plugins-dir'),
  openFile:       ()                  => ipcRenderer.invoke('file-open'),
  saveFile:       (filePath, content) => ipcRenderer.invoke('file-save', { filePath, content }),
  saveFileAs:     (content, language) => ipcRenderer.invoke('file-save-as', { content, language }),
  onMenuAction:   (callback)          => {
    const listener = (_event, action) => callback(action)
    ipcRenderer.on('menu-action', listener)
    return () => ipcRenderer.removeListener('menu-action', listener)
  },
})
