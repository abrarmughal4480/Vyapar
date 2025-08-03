import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

// Tauri integration utilities
export class TauriIntegration {
  constructor() {
    this.isTauriEnv = process.env.TAURI_ENV === 'true';
  }

  // Get app data directory for Tauri
  async getAppDataDir() {
    if (this.isTauriEnv) {
      const platform = process.platform;
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      
      switch (platform) {
        case 'win32':
          return path.join(process.env.APPDATA || '', 'Devease Digital Business Manager');
        case 'darwin':
          return path.join(homeDir, 'Library', 'Application Support', 'Devease Digital Business Manager');
        case 'linux':
          return path.join(homeDir, '.config', 'devease-digital-business-manager');
        default:
          return path.join(homeDir, '.devease');
      }
    }
    return null;
  }

  // Ensure app data directory exists
  async ensureAppDataDir() {
    const appDataDir = await this.getAppDataDir();
    if (appDataDir && !fs.existsSync(appDataDir)) {
      fs.mkdirSync(appDataDir, { recursive: true });
    }
    return appDataDir;
  }

  // Get database path for Tauri
  async getDatabasePath() {
    const appDataDir = await this.ensureAppDataDir();
    if (appDataDir) {
      return path.join(appDataDir, 'vyapar.db');
    }
    return null;
  }

  // Get config path for Tauri
  async getConfigPath() {
    const appDataDir = await this.ensureAppDataDir();
    if (appDataDir) {
      return path.join(appDataDir, 'config.json');
    }
    return null;
  }

  // Save config for Tauri
  async saveConfig(config) {
    const configPath = await this.getConfigPath();
    if (configPath) {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }
  }

  // Load config for Tauri
  async loadConfig() {
    const configPath = await this.getConfigPath();
    if (configPath && fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    }
    return {};
  }

  // Export data for Tauri
  async exportData(data, filename) {
    const appDataDir = await this.ensureAppDataDir();
    if (appDataDir) {
      const exportPath = path.join(appDataDir, filename);
      fs.writeFileSync(exportPath, JSON.stringify(data, null, 2));
      return exportPath;
    }
    return null;
  }

  // Import data for Tauri
  async importData(filename) {
    const appDataDir = await this.getAppDataDir();
    if (appDataDir) {
      const importPath = path.join(appDataDir, filename);
      if (fs.existsSync(importPath)) {
        const data = fs.readFileSync(importPath, 'utf8');
        return JSON.parse(data);
      }
    }
    return null;
  }

  // Get system info for Tauri
  async getSystemInfo() {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      isTauri: this.isTauriEnv,
      appDataDir: await this.getAppDataDir(),
    };
  }

  // Backup data for Tauri
  async backupData(data) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.json`;
    return await this.exportData(data, filename);
  }

  // Restore data for Tauri
  async restoreData(backupFile) {
    return await this.importData(backupFile);
  }

  // Get available backups
  async getAvailableBackups() {
    const appDataDir = await this.getAppDataDir();
    if (appDataDir && fs.existsSync(appDataDir)) {
      const files = fs.readdirSync(appDataDir);
      return files.filter(file => file.startsWith('backup-') && file.endsWith('.json'));
    }
    return [];
  }

  // Clean old backups (keep last 10)
  async cleanOldBackups() {
    const backups = await this.getAvailableBackups();
    if (backups.length > 10) {
      const appDataDir = await this.getAppDataDir();
      const sortedBackups = backups.sort().reverse();
      const backupsToDelete = sortedBackups.slice(10);
      
      for (const backup of backupsToDelete) {
        const backupPath = path.join(appDataDir, backup);
        if (fs.existsSync(backupPath)) {
          fs.unlinkSync(backupPath);
        }
      }
    }
  }
}

// Export singleton instance
export const tauriIntegration = new TauriIntegration();

// Convenience functions
export const getAppDataDir = () => tauriIntegration.getAppDataDir();
export const ensureAppDataDir = () => tauriIntegration.ensureAppDataDir();
export const getDatabasePath = () => tauriIntegration.getDatabasePath();
export const getConfigPath = () => tauriIntegration.getConfigPath();
export const saveConfig = (config) => tauriIntegration.saveConfig(config);
export const loadConfig = () => tauriIntegration.loadConfig();
export const exportData = (data, filename) => tauriIntegration.exportData(data, filename);
export const importData = (filename) => tauriIntegration.importData(filename);
export const getSystemInfo = () => tauriIntegration.getSystemInfo();
export const backupData = (data) => tauriIntegration.backupData(data);
export const restoreData = (backupFile) => tauriIntegration.restoreData(backupFile);
export const getAvailableBackups = () => tauriIntegration.getAvailableBackups();
export const cleanOldBackups = () => tauriIntegration.cleanOldBackups(); 