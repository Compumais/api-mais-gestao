"use strict";
const electron = require("electron");
const api = {
  invoke(method, ...args) {
    return electron.ipcRenderer.invoke("pdv:invoke", method, ...args);
  }
};
electron.contextBridge.exposeInMainWorld("pdv", api);
