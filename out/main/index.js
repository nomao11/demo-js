"use strict";
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const pg = require("pg");
const icon = path.join(__dirname, "../../resources/icon.png");
const connectDB = async () => {
  const client = new pg.Client({
    user: "postgres",
    password: "1234",
    host: "localhost",
    port: "5432",
    database: "exam"
  });
  await client.connect();
  return client;
};
async function getPartners() {
  try {
    const response = await global.dbclient.query(`SELECT T1.*,
    CASE WHEN sum(T2.production_quantity) > 300000 THEN 15
    WHEN sum(T2.production_quantity) > 50000 THEN 10
    WHEN sum(T2.production_quantity) > 10000 THEN 5
    ELSE 0 
    END as discount
    from partners as T1
    LEFT JOIN sales as T2 on T1.id = T2.partner_id
    GROUP BY T1.id`);
    return response.rows;
  } catch (e) {
    console.log(e);
  }
}
async function createPartner(event, partner) {
  const { type, name, ceo, email, phone, address, rating } = partner;
  try {
    await global.dbclient.query(`INSERT into partners (organization_type, name, ceo, email, phone, address, rating) values('${type}', '${name}', '${ceo}', '${email}', '${phone}', '${address}', ${rating})`);
    electron.dialog.showMessageBox({ message: "Успех! Партнер создан" });
  } catch (e) {
    console.log(e);
    electron.dialog.showErrorBox("Ошибка", "Партнер с таким именем уже есть");
  }
}
async function updatePartner(event, partner) {
  const { id, type, name, ceo, email, phone, address, rating } = partner;
  try {
    await global.dbclient.query(`UPDATE partners
      SET name = '${name}', organization_type = '${type}', ceo='${ceo}', email='${email}', phone='${phone}', address='${address}', rating='${rating}'
      WHERE partners.id = ${id};`);
    electron.dialog.showMessageBox({ message: "Успех! Данные обновлены" });
    return;
  } catch (e) {
    electron.dialog.showErrorBox("Невозможно создать пользователя", "Такой пользователь уже есть");
    return "error";
  }
}
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    icon: path.join(__dirname, "../../resources/icon.ico"),
    autoHideMenuBar: true,
    ...process.platform === "linux" ? { icon } : {},
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(async () => {
  utils.electronApp.setAppUserModelId("com.electron");
  global.dbclient = await connectDB();
  electron.ipcMain.handle("getPartners", getPartners);
  electron.ipcMain.handle("createPartner", createPartner);
  electron.ipcMain.handle("updatePartner", updatePartner);
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  createWindow();
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
