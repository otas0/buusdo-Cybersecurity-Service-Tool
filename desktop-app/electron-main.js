/**
 * Optional Electron shell for Preventive Shield desktop.
 * Wraps the Express dashboard and enables Finder/Explorer reveal via shell.openPath.
 *
 *   cd desktop-app && npm install --save-dev electron
 *   npm run electron
 */
const { app, BrowserWindow, shell } = require("electron");
const path = require("path");

/** Expose shell for Express `/api/lists/reveal` (same process). */
global.__shieldElectronShell = shell;

const UI_PORT = Number(process.env.UI_PORT || 3010);

// Start Express + proxy in-process.
require("./src/server.js");

function createWindow() {
  const win = new BrowserWindow({
    width: 960,
    height: 720,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadURL(`http://localhost:${UI_PORT}`);
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});