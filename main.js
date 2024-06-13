const { app, BrowserWindow } = require("electron");
const remoteMain = require("@electron/remote/main");
const { autoUpdater } = require("electron-updater");

remoteMain.initialize();

let mainWindow;

// Quit when all windows are closed.
app.on("window-all-closed", function () {
	if (process.platform != "darwin") {
		app.quit();
	}
});

// This method will be called when Electron has done everything
// initialization and ready for creating browser windows.
app.on("ready", function () {
	autoUpdater.checkForUpdatesAndNotify();
	// Create the browser window.
	mainWindow = new BrowserWindow({
		width: 1000,
		height: 950,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			enableRemoteModule: true
		}
	});

	remoteMain.enable(mainWindow.webContents);

	// and load the index.html of the app.
	mainWindow.loadURL("file://" + __dirname + "/index.html");

	// Emitted when the window is closed.
	mainWindow.on("closed", function () {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		mainWindow = null;
	});
});
