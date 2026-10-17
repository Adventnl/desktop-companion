'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('miso', Object.freeze({
  getState: () => ipcRenderer.invoke('state:get'),
  update: (patch) => ipcRenderer.invoke('settings:update', patch),
  action: (action) => ipcRenderer.invoke('pet:action', action),
  drag: (phase) => ipcRenderer.send('pet:drag', phase),
  menu: () => ipcRenderer.send('pet:menu'),
  panel: () => ipcRenderer.send('panel:open'),
  closePanel: () => ipcRenderer.send('panel:close'),
  onState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('state', listener);
    return () => ipcRenderer.removeListener('state', listener);
  },
}));
