// Content script for Secure Google Forms extension
// Scope: Monitor Google Forms and detect phishing links only
// Security: No external data transmission, local heuristics only

// Import DOMPurify for sanitization (will be bundled by webpack)
// Note: DOMPurify will be available globally after webpack bundling

(function() {
  'use strict';

  // Configuration
  const EXTENSION_ID = 'secure-google-forms';
  const BANNER_ID = `${EXTENSION_ID}-warning-banner`;
  
  // Track forms that have been processed to avoid duplicate banners
  const processedForms = new WeakSet();
  
  // Heuristic patterns for detection
  const GOOGLE_DOMAINS = ['google.com', 'docs.google.com', 'forms.gle', 'googleforms.com'];
  const SUSPICIOUS_PATTERNS = {
    IP_ADDRESS: /^https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/,
    PUNYCODE: /xn--/,
    MAILTO: /^mailto:/
  };

  // Only process pages that might be relevant
  function shouldProcessPage() {
    const url = window.location.href.toLowerCase();
    const title = document.title.toLowerCase();
    const hasForm = document.querySelector('form') !== null;
    
    // Process if:
    // 1. Page has forms AND (looks like Google Forms OR is in test_pages)
    // 2. Or if URL contains google/forms related terms
    return hasForm && (
      url.includes('google') || 
      url.includes('forms') || 
      url.includes('test_pages') ||
      title.includes('google form') ||
      document.querySelector('[alt*="Google"]')
    );
  }

  // Check if a URL belongs to legitimate Google domains
  function isGoogleDomain(url) {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return GOOGLE_DOMAINS.some(domain => hostname.includes(domain));
    } catch (e) {
      return false;
    }
  }

  // Check if page appears to be a Google Form based on visual/content cues
  function looksLikeGoogleForm() {
    const title = document.title.toLowerCase();
    const bodyText = document.body.textContent.toLowerCase();
    
    // Check for Google Form indicators
    const indicators = [
      title.includes('google form'),
      bodyText.includes('google form'),
      document.querySelector('[alt*="Google"]'),
      document.querySelector('[src*="google"]'),
      document.querySelector('.google-logo'),
      document.querySelector('[class*="google"]')
    ];
    
    return indicators.some(indicator => indicator);
  }

  // Analyze form for phishing indicators
  function analyzeForm(form) {
    const formAction = form.action || form.getAttribute('action') || '';
    const pageUrl = window.location.href;
    const suspiciousReasons = [];

    // Check if form action is suspicious
    if (formAction) {
      // Flag non-Google actions on Google-looking forms
      if (looksLikeGoogleForm() && !isGoogleDomain(formAction)) {
        suspiciousReasons.push(`Form appears to be Google Form but submits to non-Google domain: ${formAction}`);
      }
      
      // Flag suspicious URL patterns
      if (SUSPICIOUS_PATTERNS.IP_ADDRESS.test(formAction)) {
        suspiciousReasons.push(`Form submits to IP address: ${formAction}`);
      }
      
      if (SUSPICIOUS_PATTERNS.MAILTO.test(formAction)) {
        suspiciousReasons.push(`Form uses mailto action: ${formAction}`);
      }
      
      if (SUSPICIOUS_PATTERNS.PUNYCODE.test(formAction)) {
        suspiciousReasons.push(`Form action contains punycode: ${formAction}`);
      }
    }

    return {
      formAction,
      pageUrl,
      reasons: suspiciousReasons,
      isSuspicious: suspiciousReasons.length > 0
    };
  }

  // Analyze links on the page for suspicious patterns
  function analyzeSuspiciousLinks() {
    const links = document.querySelectorAll('a[href]');
    const suspiciousLinks = [];

    links.forEach(link => {
      const href = link.href;
      
      if (SUSPICIOUS_PATTERNS.IP_ADDRESS.test(href)) {
        suspiciousLinks.push({ url: href, reason: 'IP address link' });
      }
      
      if (SUSPICIOUS_PATTERNS.PUNYCODE.test(href)) {
        suspiciousLinks.push({ url: href, reason: 'Punycode link' });
      }
      
      // On Google-looking pages, flag non-Google links as potentially suspicious
      if (looksLikeGoogleForm() && !isGoogleDomain(href) && !href.startsWith('#') && !href.startsWith('javascript:')) {
        suspiciousLinks.push({ url: href, reason: 'Non-Google link on Google-looking form' });
      }
    });

    return suspiciousLinks;
  }

  // Helper function to sanitize text using DOMPurify or basic sanitization
  function sanitizeText(text) {
    // Use DOMPurify if available, otherwise basic sanitization
    if (typeof DOMPurify !== 'undefined') {
      return DOMPurify.sanitize(text);
    }
    // Basic sanitization fallback
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Helper function to disable form submission
  function disableFormSubmission(formElement) {
    const submitButtons = formElement.querySelectorAll('button[type="submit"], input[type="submit"]');
    submitButtons.forEach(button => {
      button.disabled = true;
      button.dataset.originalDisabled = button.disabled;
    });
    
    // Also prevent form submission via Enter key
    formElement.addEventListener('submit', preventSubmission);
  }

  // Helper function to enable form submission
  function enableFormSubmission(formElement) {
    const submitButtons = formElement.querySelectorAll('button[type="submit"], input[type="submit"]');
    submitButtons.forEach(button => {
      button.disabled = button.dataset.originalDisabled === 'true';
    });
    
    // Remove the submit prevention listener
    formElement.removeEventListener('submit', preventSubmission);
  }

  // Prevent form submission handler
  function preventSubmission(e) {
    e.preventDefault();
    return false;
  }

  // Create form-specific warning banner
  function createFormWarningBanner(formElement, analysis) {
    // Check if this form already has a banner
    const existingBanner = formElement.parentNode.querySelector(`[data-form-banner="${EXTENSION_ID}"]`);
    if (existingBanner) {
      return; // Banner already exists for this form
    }

    const banner = document.createElement('div');
    banner.setAttribute('data-form-banner', EXTENSION_ID);
    banner.style.cssText = `
      background: #ffcccc;
      color: black;
      padding: 12px;
      margin-bottom: 16px;
      border: 2px solid #ff0000;
      border-radius: 4px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      font-weight: bold;
    `;

    const messageDiv = document.createElement('div');
    messageDiv.style.marginBottom = '8px';
    
    const warningText = sanitizeText('⚠️ Suspicious form detected. Submission is blocked for your safety.');
    messageDiv.textContent = warningText;

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 8px; align-items: center;';

    const ignoreButton = document.createElement('button');
    ignoreButton.textContent = 'Ignore & Submit Anyway';
    ignoreButton.style.cssText = `
      background: #ffffff;
      color: #000000;
      border: 2px solid #ff0000;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    `;

    ignoreButton.addEventListener('click', () => {
      console.log('[content] User overrode warning for form:', formElement.action || 'unknown');
      
      // Enable form submission
      enableFormSubmission(formElement);
      
      // Update banner message
      messageDiv.textContent = sanitizeText('Submission enabled — proceed with caution.');
      messageDiv.style.color = '#ff6600';
      
      // Hide the ignore button
      ignoreButton.style.display = 'none';
    });

    buttonContainer.appendChild(ignoreButton);
    banner.appendChild(messageDiv);
    banner.appendChild(buttonContainer);

    // Insert banner just before the form
    formElement.parentNode.insertBefore(banner, formElement);
    console.log('[content] Warning banner injected for form:', formElement.action || 'unknown');
    
    // Disable form submission by default
    disableFormSubmission(formElement);
  }

  // Block form submission (legacy function for compatibility)
  function blockFormSubmission() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      disableFormSubmission(form);
    });
  }

  // Send alert to background script
  function sendAlert(analysis, suspiciousLinks) {
    // Sanitize data before sending (using basic sanitization since DOMPurify might not be available)
    const sanitizedData = {
      type: 'PHISHING_ALERT',
      reason: (analysis.reasons || []).join(', ').substring(0, 500),
      formAction: (analysis.formAction || '').substring(0, 200),
      pageUrl: (analysis.pageUrl || window.location.href).substring(0, 200),
      suspiciousLinks: (suspiciousLinks || []).slice(0, 10).map(link => ({
        url: (link.url || '').substring(0, 200),
        reason: (link.reason || '').substring(0, 100)
      })),
      timestamp: Date.now()
    };
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      try {
        console.log('[content] Sending PHISHING_ALERT:', sanitizedData);
        chrome.runtime.sendMessage(sanitizedData, (response) => {
          if (chrome.runtime && chrome.runtime.lastError) {
            console.warn('[content] sendMessage lastError:', chrome.runtime.lastError.message);
          } else {
            console.log('[content] PHISHING_ALERT acknowledged:', response);
          }
        });
      } catch (err) {
        console.error('[content] Failed to send message:', err);
      }
    }
  }

  // Main analysis function
  function analyzePageForPhishing() {
    if (!shouldProcessPage()) {
      return;
    }

    const forms = document.querySelectorAll('form');
    const suspiciousLinks = analyzeSuspiciousLinks();
    let foundSuspiciousForm = false;

    forms.forEach(form => {
      // Skip if this form has already been processed
      if (processedForms.has(form)) {
        return;
      }
      
      const analysis = analyzeForm(form);
      
      if (analysis.isSuspicious) {
        foundSuspiciousForm = true;
        // Create form-specific banner instead of global banner
        createFormWarningBanner(form, analysis);
        sendAlert(analysis, suspiciousLinks);
        // Mark this form as processed
        processedForms.add(form);
      }
    });

    // Also alert if suspicious links found on Google-looking pages
    if (!foundSuspiciousForm && suspiciousLinks.length > 0 && looksLikeGoogleForm()) {
      const analysis = {
        formAction: '',
        pageUrl: window.location.href,
        reasons: [`Suspicious links found: ${suspiciousLinks.map(l => l.reason).join(', ')}`],
        isSuspicious: true
      };
      
      // For suspicious links without specific forms, still send alert but don't block forms
      sendAlert(analysis, suspiciousLinks);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', analyzePageForPhishing);
  } else {
    analyzePageForPhishing();
  }

  // Re-analyze if page content changes (for dynamic forms)
  const observer = new MutationObserver((mutations) => {
    const hasNewForms = mutations.some(mutation => 
      Array.from(mutation.addedNodes).some(node => 
        node.nodeType === 1 && (node.tagName === 'FORM' || (node.querySelector && node.querySelector('form')))
      )
    );
    
    if (hasNewForms) {
      setTimeout(analyzePageForPhishing, 500); // Debounce
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

})();
