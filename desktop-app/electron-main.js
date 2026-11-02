/**
 * Preventive Shield desktop shell.
 * One instance owns the dashboard and proxy. Closing the window stops both.
 *
 *   cd desktop-app && npm install
 *   npm run electron
 */
const { app, BrowserWindow, shell } = require("electron");
const path = require("path");

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

const { shutdown } = require("./src/server.js");

/** Expose shell for Express `/api/lists/reveal` (same process). */
global.__shieldElectronShell = shell;

const UI_PORT = Number(process.env.UI_PORT || 3010);
let mainWindow = null;
let stopping = false;

function createWindow() {
  const win = new BrowserWindow({
    width: 960,
    height: 720,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "electron-preload.js")
    }
  });
  mainWindow = win;
  win.loadURL(`http://localhost:${UI_PORT}`);
  win.on("closed", () => {
    mainWindow = null;
  });
}

async function stopAndExit() {
  if (stopping) return;
  stopping = true;
  try {
    await shutdown();
  } finally {
    app.exit(0);
  }
}

app.on("second-instance", () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  void stopAndExit();
});