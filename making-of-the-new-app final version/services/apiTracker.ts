
import { ApiLog, AdminSettings } from '../types';

const STORAGE_KEY = 'achievers_api_logs';
const SETTINGS_KEY = 'achievers_admin_settings';

// --- CONFIGURATION ---
const MAX_RPM = 15; // Standard Gemini Free Tier Limit
const DEFAULT_ALERT_EMAIL = 'khapandianiruddh734@gmail.com'; 
const DEFAULT_THRESHOLD = 80; 
// ---------------------

const DEFAULT_SETTINGS: AdminSettings = {
  alertEmail: DEFAULT_ALERT_EMAIL,
  threshold: DEFAULT_THRESHOLD,
};

export const apiTracker = {
  logRequest: (log: Omit<ApiLog, 'id' | 'timestamp'>) => {
    const logs = apiTracker.getLogs();
    const newLog: ApiLog = {
      ...log,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    };
    logs.unshift(newLog);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, 100)));

    // Check for threshold alerts
    apiTracker.checkAlerts();
  },

  getLogs: (): ApiLog[] => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  },

  getSettings: (): AdminSettings => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  },

  updateSettings: (settings: AdminSettings) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  },

  checkAlerts: () => {
    const stats = apiTracker.getStats();
    const settings = apiTracker.getSettings();
    const usagePercent = (stats.rpm / stats.limit) * 100;

    if (usagePercent >= settings.threshold) {
      const now = Date.now();
      if (!settings.lastAlertSent || now - settings.lastAlertSent > 600000) {
        apiTracker.triggerEmailAlert(usagePercent, settings.alertEmail);
        apiTracker.updateSettings({ ...settings, lastAlertSent: now });
      }
    }
  },

  triggerEmailAlert: (usage: number, email: string) => {
    console.warn(`[API ALERT] Email alert triggered for ${email}. Usage: ${usage.toFixed(1)}%`);
    
    const alertLog: ApiLog = {
      id: 'alert-' + Date.now(),
      timestamp: Date.now(),
      tool: 'System Alert',
      model: 'N/A',
      status: 'error',
      latency: 0,
      fileCount: 0,
      fileFormats: [],
      errorMessage: `CRITICAL: ${usage.toFixed(1)}% usage. Notification sent to ${email}.`,
      isAlert: true
    };
    
    const logs = apiTracker.getLogs();
    logs.unshift(alertLog);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, 100)));
  },

  getStats: () => {
    const logs = apiTracker.getLogs();
    const now = Date.now();
    const validLogs = logs.filter(l => !l.isAlert);
    const lastMinuteLogs = validLogs.filter(l => now - l.timestamp < 60000);
    const successLogs = validLogs.filter(l => l.status === 'success');

    // Aggregate File Stats
    const totalFiles = validLogs.reduce((acc, curr) => acc + (curr.fileCount || 0), 0);
    const formatMap: Record<string, number> = {};
    validLogs.forEach(log => {
      log.fileFormats?.forEach(fmt => {
        const ext = fmt.toLowerCase();
        formatMap[ext] = (formatMap[ext] || 0) + 1;
      });
    });

    const totalLatency = successLogs.reduce((acc, curr) => acc + curr.latency, 0);
    const avgLatency = successLogs.length > 0 ? Math.round(totalLatency / successLogs.length) : 0;

    let health: 'Healthy' | 'Degraded' | 'Critical' = 'Healthy';
    const errorRate = validLogs.length > 0 ? (validLogs.filter(l => l.status === 'error').length / validLogs.length) * 100 : 0;
    
    if (errorRate > 50 || (lastMinuteLogs.length / MAX_RPM) > 0.95) health = 'Critical';
    else if (errorRate > 15 || (lastMinuteLogs.length / MAX_RPM) > 0.8) health = 'Degraded';

    return {
      total: validLogs.length,
      totalFiles,
      formatDistribution: formatMap,
      rpm: lastMinuteLogs.length,
      limit: MAX_RPM,
      successRate: validLogs.length > 0 ? (successLogs.length / validLogs.length) * 100 : 0,
      avgLatency,
      health,
      recentLogs: logs.slice(0, 20)
    };
  },

  clearLogs: () => {
    localStorage.removeItem(STORAGE_KEY);
  }
};
