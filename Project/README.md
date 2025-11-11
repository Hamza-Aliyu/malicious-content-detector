# Secure Google Forms - Browser Extension

A lightweight browser extension that monitors Google Forms and detects phishing links using heuristic-based analysis. This extension operates entirely locally with no external data transmission.

## Features

- **Google Forms Monitoring**: Detects legitimate Google Forms vs potential impersonations
- **Phishing Link Detection**: Identifies suspicious URLs, IP addresses, and punycode domains
- **Real-time Alerts**: Visual warnings and browser notifications for detected threats
- **Local Processing**: All analysis happens locally - no data sent externally
- **Minimal Permissions**: Only requests necessary permissions for operation

## Heuristics Implemented

The extension uses lightweight, rule-based detection methods:

1. **Form Action Analysis**: Checks if forms claiming to be Google Forms actually submit to Google domains
2. **Visual Cue Detection**: Analyzes page content for Google branding vs actual form destinations
3. **Suspicious URL Patterns**: Detects IP addresses, punycode domains, and mailto actions
4. **Domain Verification**: Validates that Google-looking pages actually use Google domains

## Installation & Testing

### Prerequisites

- Node.js (v14 or higher)
- Chrome/Chromium browser

### Build the Extension

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build the extension**:
   ```bash
   npm run build
   ```
   This creates a `dist/` folder with the compiled extension.

### Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist/` folder from this project
5. The extension should now appear in your extensions list

### Test the Extension

1. **Start the test server**:
   ```bash
   npm run serve
   ```
   This serves the test pages at `http://localhost:8080`

2. **Test with valid Google Form**:
   - Navigate to `http://localhost:8080/google_form_valid.html`
   - This should NOT trigger any warnings (legitimate Google Form)

3. **Test with phishing form**:
   - Navigate to `http://localhost:8080/google_form_phish.html`
   - This SHOULD trigger warnings (phishing attempt detected)
   - You should see a red warning banner and browser notification

### Extension Usage

- **Popup Interface**: Click the extension icon to view recent alerts and settings
- **Settings**: Toggle extension on/off and enable/disable notifications
- **Alert Management**: View, dismiss, or clear security alerts
- **Form Blocking**: Option to block suspicious form submissions

## Project Structure

```
secure-google-forms/
├── src/
│   ├── manifest.json          # Extension manifest (Manifest V3)
│   ├── background.js          # Service worker for handling alerts
│   ├── content.js             # Content script with detection logic
│   ├── popup.html             # Extension popup interface
│   ├── popup.js               # Popup functionality
│   ├── styles.css             # Popup and content styles
│   ├── icons/                 # Extension icons (SVG)
│   └── test_pages/            # Test HTML pages
│       ├── google_form_valid.html    # Legitimate Google Form
│       └── google_form_phish.html    # Phishing attempt
├── dist/                      # Built extension (created by webpack)
├── webpack.config.js          # Build configuration
├── package.json               # Dependencies and scripts
└── README.md                  # This file
```

## Security & Privacy

- **No External Requests**: Extension never sends data to external servers
- **Local Storage Only**: Alerts stored in `chrome.storage.local`
- **Minimal Data Collection**: Only analyzes form actions and page structure
- **No Form Data Access**: Extension does not read or store form input values
- **Open Source**: All code is transparent and auditable

## Limitations

- **Heuristic-Based**: May produce false positives/negatives
- **Visual Similarity**: Cannot detect perfectly crafted visual replicas
- **Dynamic Content**: May miss forms loaded after page load
- **Domain Spoofing**: Cannot detect sophisticated domain spoofing techniques
- **No ML Training**: Uses simple rules rather than machine learning

## Development

### Available Scripts

- `npm run build` - Build the extension for production
- `npm run serve` - Serve test pages on localhost:8080
- `npm start` - Build and serve (combines above commands)

### Adding New Heuristics

To add new detection rules, modify `src/content.js`:

1. Add new patterns to `SUSPICIOUS_PATTERNS`
2. Implement detection logic in `analyzeForm()` or `analyzeSuspiciousLinks()`
3. Update reason messages for user clarity

### Testing Changes

1. Make code changes
2. Run `npm run build`
3. Reload extension in Chrome (chrome://extensions/)
4. Test with provided test pages or create new ones

## Troubleshooting

**Extension not loading:**
- Ensure `dist/` folder exists (run `npm run build`)
- Check Chrome developer console for errors
- Verify manifest.json is valid

**No alerts showing:**
- Check if extension is enabled in popup
- Verify test pages are served via HTTP (not file://)
- Check browser notifications are enabled

**Build errors:**
- Ensure Node.js and npm are installed
- Delete `node_modules/` and run `npm install`
- Check for PowerShell execution policy issues on Windows

## Contributing

This extension is designed for educational and testing purposes. When contributing:

1. Maintain focus on Google Forms and phishing detection only
2. Keep all processing local (no external API calls)
3. Add appropriate comments explaining heuristics
4. Test with both valid and phishing examples
5. Update documentation for new features

## License

MIT License - See package.json for details.
