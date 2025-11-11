// Popup script for Secure Google Forms extension
document.addEventListener('DOMContentLoaded', async () => {
  // DOM elements
  const extensionToggle = document.getElementById('extension-toggle');
  const notificationsToggle = document.getElementById('notifications-toggle');
  const statusText = document.getElementById('status-text');
  const alertsContainer = document.getElementById('alerts-container');
  const noAlertsDiv = document.getElementById('no-alerts');
  const clearAlertsBtn = document.getElementById('clear-alerts');

  // Load initial data
  await loadSettings();
  await loadAlerts();

  // Event listeners
  extensionToggle.addEventListener('change', handleExtensionToggle);
  notificationsToggle.addEventListener('change', handleNotificationsToggle);
  clearAlertsBtn.addEventListener('click', handleClearAlerts);

  // Load and display current settings
  async function loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (response.success) {
        const settings = response.settings;
        extensionToggle.checked = settings.enabled;
        notificationsToggle.checked = settings.notificationsEnabled;
        updateStatusText(settings.enabled);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  // Load and display alerts
  async function loadAlerts() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_ALERTS' });
      if (response.success) {
        displayAlerts(response.alerts);
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
      alertsContainer.innerHTML = '<div class="error">Error loading alerts</div>';
    }
  }

  // Display alerts in the popup
  function displayAlerts(alerts) {
    if (!alerts || alerts.length === 0) {
      alertsContainer.style.display = 'none';
      noAlertsDiv.style.display = 'block';
      return;
    }

    alertsContainer.style.display = 'block';
    noAlertsDiv.style.display = 'none';

    alertsContainer.innerHTML = alerts.map(alert => `
      <div class="alert-item" data-alert-id="${alert.id}">
        <div class="alert-header">
          <div class="alert-title">
            <span class="alert-icon">⚠️</span>
            <strong>Phishing Detected</strong>
          </div>
          <div class="alert-actions">
            <button class="delete-alert" data-alert-id="${alert.id}">×</button>
          </div>
        </div>
        <div class="alert-details">
          <div class="alert-page">
            <strong>Page:</strong> ${escapeHtml(alert.pageTitle)}
          </div>
          <div class="alert-url">
            <strong>URL:</strong> <a href="${escapeHtml(alert.pageUrl)}" target="_blank" class="alert-link">
              ${truncateUrl(alert.pageUrl)}
            </a>
          </div>
          <div class="alert-reason">
            <strong>Reason:</strong> ${escapeHtml(alert.reason)}
          </div>
          ${alert.formAction ? `
            <div class="alert-form-action">
              <strong>Form Action:</strong> ${escapeHtml(alert.formAction)}
            </div>
          ` : ''}
          ${alert.suspiciousLinks && alert.suspiciousLinks.length > 0 ? `
            <div class="alert-links">
              <strong>Suspicious Links:</strong>
              <ul>
                ${alert.suspiciousLinks.slice(0, 3).map(link => `
                  <li>${escapeHtml(link.reason)}: ${escapeHtml(truncateUrl(link.url))}</li>
                `).join('')}
                ${alert.suspiciousLinks.length > 3 ? `<li>... and ${alert.suspiciousLinks.length - 3} more</li>` : ''}
              </ul>
            </div>
          ` : ''}
        </div>
        <div class="alert-timestamp">
          ${formatTimestamp(alert.timestamp)}
        </div>
      </div>
    `).join('');

    // Add event listeners for delete buttons
    document.querySelectorAll('.delete-alert').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const alertId = e.target.getAttribute('data-alert-id');
        handleDeleteAlert(alertId);
      });
    });
  }

  // Handle extension enable/disable toggle
  async function handleExtensionToggle() {
    const enabled = extensionToggle.checked;
    try {
      const currentSettings = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (currentSettings.success) {
        const newSettings = { ...currentSettings.settings, enabled };
        await chrome.runtime.sendMessage({ 
          type: 'UPDATE_SETTINGS', 
          settings: newSettings 
        });
        updateStatusText(enabled);
      }
    } catch (error) {
      console.error('Error updating extension toggle:', error);
      // Revert toggle on error
      extensionToggle.checked = !enabled;
    }
  }

  // Handle notifications toggle
  async function handleNotificationsToggle() {
    const notificationsEnabled = notificationsToggle.checked;
    try {
      const currentSettings = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (currentSettings.success) {
        const newSettings = { ...currentSettings.settings, notificationsEnabled };
        await chrome.runtime.sendMessage({ 
          type: 'UPDATE_SETTINGS', 
          settings: newSettings 
        });
      }
    } catch (error) {
      console.error('Error updating notifications toggle:', error);
      // Revert toggle on error
      notificationsToggle.checked = !notificationsEnabled;
    }
  }

  // Handle clear all alerts
  async function handleClearAlerts() {
    if (confirm('Clear all alerts? This action cannot be undone.')) {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'CLEAR_ALERTS' });
        if (response.success) {
          await loadAlerts(); // Refresh the display
        }
      } catch (error) {
        console.error('Error clearing alerts:', error);
      }
    }
  }

  // Handle delete individual alert
  async function handleDeleteAlert(alertId) {
    try {
      const response = await chrome.runtime.sendMessage({ 
        type: 'DELETE_ALERT', 
        alertId 
      });
      if (response.success) {
        await loadAlerts(); // Refresh the display
      }
    } catch (error) {
      console.error('Error deleting alert:', error);
    }
  }

  // Update status text based on extension state
  function updateStatusText(enabled) {
    statusText.textContent = enabled ? 'Active' : 'Disabled';
    statusText.className = enabled ? 'status-active' : 'status-disabled';
  }

  // Utility functions
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Storage change listerner
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.phishing_alerts) {
      loadAlerts();
    }
  });
  
  function truncateUrl(url, maxLength = 50) {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + '...';
  }

  function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  }
});
