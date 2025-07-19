const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const net = require('net');

const isDev = process.env.NODE_ENV === 'development';
let nextApp = null;

// Check if port is available
function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
}

// Start Next.js server
async function startNextServer() {
  if (isDev) return; // Dev mode mein separate server chalti hai
  
  const port = 3000;
  const isPortFree = await checkPort(port);
  
  if (!isPortFree) {
    console.log('Port 3000 already in use');
    return;
  }

  return new Promise((resolve, reject) => {
    const nextServerPath = path.join(__dirname, 'node_modules', '.bin', 'next');
    
    nextApp = spawn('node', [nextServerPath, 'start'], {
      cwd: __dirname,
      env: { ...process.env, PORT: port },
      stdio: 'pipe'
    });

    nextApp.stdout.on('data', (data) => {
      console.log(`Next.js: ${data}`);
      if (data.toString().includes('Local:') || data.toString().includes('ready')) {
        resolve();
      }
    });

    nextApp.stderr.on('data', (data) => {
      console.error(`Next.js Error: ${data}`);
    });

    nextApp.on('error', (err) => {
      console.error('Failed to start Next.js server:', err);
      reject(err);
    });

    // Timeout fallback
    setTimeout(() => resolve(), 5000);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    },
    icon: path.join(__dirname, 'assets', 'icon.png') // App icon
  });

  // Remove menu bar
  win.setMenuBarVisibility(false);

  const loadApp = () => {
    win.loadURL('http://localhost:3000').catch((err) => {
      console.log('Retrying connection...', err.message);
      setTimeout(loadApp, 2000);
    });
  };

  if (isDev) {
    loadApp();
    win.webContents.openDevTools();
  } else {
    // Production mein pehle server start karein
    startNextServer().then(() => {
      setTimeout(loadApp, 2000); // Server start hone ka wait
    }).catch(console.error);
  }

  // External links ko default browser mein open karein
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (nextApp) {
    nextApp.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (nextApp) {
    nextApp.kill();
  }
});