import { app, BrowserWindow, Menu, shell } from 'electron'

const GITHUB_URL = 'https://github.com/Alter25/xp-playground'

function send(action) {
  BrowserWindow.getFocusedWindow()?.webContents.send('menu-action', action)
}

function closeWindow() {
  BrowserWindow.getFocusedWindow()?.close()
}

export default function installMenu() {
  const isDev = Boolean(process.env.VITE_DEV_SERVER_URL)

  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about', label: `Acerca de ${app.name}` },
        { type: 'separator' },
        { role: 'services', label: 'Servicios' },
        { type: 'separator' },
        { role: 'hide', label: `Ocultar ${app.name}` },
        { role: 'hideOthers', label: 'Ocultar otros' },
        { role: 'unhide', label: 'Mostrar todo' },
        { type: 'separator' },
        { role: 'quit', label: `Salir de ${app.name}` },
      ],
    },
    {
      label: 'Archivo',
      submenu: [
        { label: 'Nuevo archivo', accelerator: 'CmdOrCtrl+N', click: () => send('new-file') },
        { label: 'Nueva pestaña', accelerator: 'CmdOrCtrl+T', click: () => send('new-tab') },
        { type: 'separator' },
        { label: 'Abrir…', accelerator: 'CmdOrCtrl+O', click: () => send('open') },
        { type: 'separator' },
        { label: 'Guardar', accelerator: 'CmdOrCtrl+S', click: () => send('save') },
        { label: 'Guardar como…', accelerator: 'CmdOrCtrl+Shift+S', click: () => send('save-as') },
        { type: 'separator' },
        { label: 'Cerrar pestaña', accelerator: 'CmdOrCtrl+W', click: () => send('close-tab') },
        { label: 'Cerrar ventana', accelerator: 'CmdOrCtrl+Shift+W', click: closeWindow },
        { type: 'separator' },
        { label: 'Carpeta de plugins…', click: () => send('open-plugins') },
      ],
    },
    {
      label: 'Editar',
      submenu: [
        { role: 'undo', label: 'Deshacer' },
        { role: 'redo', label: 'Rehacer' },
        { type: 'separator' },
        { role: 'cut', label: 'Cortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Pegar' },
        { role: 'selectAll', label: 'Seleccionar todo' },
      ],
    },
    {
      label: 'Ver',
      submenu: [
        ...(isDev
          ? [
              { role: 'reload', label: 'Recargar' },
              { role: 'forceReload', label: 'Forzar recarga' },
              { role: 'toggleDevTools', label: 'Herramientas de desarrollo' },
              { type: 'separator' },
            ]
          : []),
        { role: 'resetZoom', label: 'Tamaño real' },
        { role: 'zoomIn', label: 'Acercar' },
        { role: 'zoomOut', label: 'Alejar' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Pantalla completa' },
      ],
    },
    {
      label: 'Ventana',
      submenu: [
        { role: 'minimize', label: 'Minimizar' },
        { role: 'zoom', label: 'Zoom' },
        { type: 'separator' },
        { role: 'front', label: 'Traer todo al frente' },
      ],
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'XP Playground en GitHub',
          click: () => shell.openExternal(GITHUB_URL),
        },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
