// Backup created on 2025-10-03_20-29-24
// --- ORIGINAL CONTENT BELOW ---
// Background service worker for Secure Google Forms extension
// Handles alerts from content script and manages notifications

// Storage key for alerts
const ALERTS_STORAGE_KEY = 'phishing_alerts';
const SETTINGS_STORAGE_KEY = 'extension_settings';

// Initialize extension settings
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    [SETTINGS_STORAGE_KEY]: {
      enabled: true,
      notificationsEnabled: true
    }
  });
  console.log('Secure Google Forms extension installed');
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PHISHING_ALERT') {
    handlePhishingAlert(message, sender.tab);
    sendResponse({ success: true });
  }
  
  return true; // Keep message channel open for async response
});

// Handle phishing alerts
async function handlePhishingAlert(alertData, tab) {
  try {
    // Get current settings
    const result = await chrome.storage.local.get([SETTINGS_STORAGE_KEY]);
    const settings = result[SETTINGS_STORAGE_KEY] || { enabled: true, notificationsEnabled: true };
    
    if (!settings.enabled) {
      return; // Extension is disabled
    }
    
    // Store the alert
    await storeAlert(alertData, tab);
    
    // Show notification if enabled
    if (settings.notificationsEnabled) {
      await showNotification(alertData, tab);
    }
    
  } catch (error) {
    console.error('Error handling phishing alert:', error);
  }
}

// Store alert in local storage
async function storeAlert(alertData, tab) {
  try {
    // Get existing alerts
    const result = await chrome.storage.local.get([ALERTS_STORAGE_KEY]);
    const alerts = result[ALERTS_STORAGE_KEY] || [];
    
    // Create new alert entry
    const newAlert = {
      id: Date.now().toString(),
      timestamp: alertData.timestamp || Date.now(),
      reason: alertData.reason,
      formAction: alertData.formAction,
      pageUrl: alertData.pageUrl,
      pageTitle: tab?.title || 'Unknown Page',
      suspiciousLinks: alertData.suspiciousLinks || [],
      tabId: tab?.id
    };
    
    // Add to beginning of array (most recent first)
    alerts.unshift(newAlert);
    
    // Keep only last 50 alerts to prevent storage bloat
    const trimmedAlerts = alerts.slice(0, 50);
    
    // Save back to storage
    await chrome.storage.local.set({
      [ALERTS_STORAGE_KEY]: trimmedAlerts
    });
    
    console.log('Stored phishing alert:', newAlert);
    
  } catch (error) {
    console.error('Error storing alert:', error);
  }
}

// Show browser notification
async function showNotification(alertData, tab) {
  try {
    const notificationOptions = {
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Secure Google Forms - Phishing Detected',
      message: `Suspicious activity detected on ${tab?.title || 'current page'}. Click to view details.`,
      contextMessage: alertData.reason.substring(0, 100),
      priority: 2
    };
    
    const notificationId = await chrome.notifications.create(
      `phishing_alert_${Date.now()}`,
      notificationOptions
    );
    
    console.log('Notification shown:', notificationId);
    
  } catch (error) {
    console.error('Error showing notification:', error);
  }
}

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith('phishing_alert_')) {
    // Open extension popup by focusing on the extension action
    chrome.action.openPopup().catch(() => {
      // If popup can't be opened programmatically, we can't do much
      console.log('Could not open popup programmatically');
    });
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_ALERTS':
      getStoredAlerts().then(sendResponse);
      return true;
      
    case 'CLEAR_ALERTS':
      clearAllAlerts().then(sendResponse);
      return true;
      
    case 'GET_SETTINGS':
      getSettings().then(sendResponse);
      return true;
      
    case 'UPDATE_SETTINGS':
      updateSettings(message.settings).then(sendResponse);
      return true;
      
    case 'DELETE_ALERT':
      deleteAlert(message.alertId).then(sendResponse);
      return true;
  }
});

// Get stored alerts
async function getStoredAlerts() {
  try {
    const result = await chrome.storage.local.get([ALERTS_STORAGE_KEY]);
    return { success: true, alerts: result[ALERTS_STORAGE_KEY] || [] };
  } catch (error) {
    console.error('Error getting alerts:', error);
    return { success: false, error: error.message };
  }
}

// Clear all alerts
async function clearAllAlerts() {
  try {
    await chrome.storage.local.set({ [ALERTS_STORAGE_KEY]: [] });
    return { success: true };
  } catch (error) {
    console.error('Error clearing alerts:', error);
    return { success: false, error: error.message };
  }
}

// Get extension settings
async function getSettings() {
  try {
    const result = await chrome.storage.local.get([SETTINGS_STORAGE_KEY]);
    return { 
      success: true, 
      settings: result[SETTINGS_STORAGE_KEY] || { enabled: true, notificationsEnabled: true }
    };
  } catch (error) {
    console.error('Error getting settings:', error);
    return { success: false, error: error.message };
  }
}

// Update extension settings
async function updateSettings(newSettings) {
  try {
    await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: newSettings });
    return { success: true };
  } catch (error) {
    console.error('Error updating settings:', error);
    return { success: false, error: error.message };
  }
}

// Delete specific alert
async function deleteAlert(alertId) {
  try {
    const result = await chrome.storage.local.get([ALERTS_STORAGE_KEY]);
    const alerts = result[ALERTS_STORAGE_KEY] || [];
    
    const filteredAlerts = alerts.filter(alert => alert.id !== alertId);
    
    await chrome.storage.local.set({ [ALERTS_STORAGE_KEY]: filteredAlerts });
    return { success: true };
  } catch (error) {
    console.error('Error deleting alert:', error);
    return { success: false, error: error.message };
  }
}
