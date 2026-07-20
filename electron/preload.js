import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('xp', {
  runCode:        (code, language)    => ipcRenderer.invoke('run-code', { code, language }),
  transformJSX:   (code, language)    => ipcRenderer.invoke('transform-jsx', { code, language }),
  getPlugins:     ()                  => ipcRenderer.invoke('get-plugins'),
  openPluginsDir: ()                  => ipcRenderer.invoke('open-plugins-dir'),
  openFile:       ()                  => ipcRenderer.invoke('file-open'),
  saveFile:       (filePath, content) => ipcRenderer.invoke('file-save', { filePath, content }),
  saveFileAs:     (content, language) => ipcRenderer.invoke('file-save-as', { content, language }),
  minimize:       ()                  => ipcRenderer.send('window-minimize'),
  maximize:       ()                  => ipcRenderer.send('window-maximize'),
  close:          ()                  => ipcRenderer.send('window-close'),
})
