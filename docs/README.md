# PrestaShop Debug Pro Enhanced v2.0

## 🎯 Overview
Advanced Chrome extension for PrestaShop debugging with Universal Monitoring, CDP Integration, and LLM-optimized analysis.

## 🚀 Features

### 🔍 Monitoring Systems
- **Universal Browser Event Monitor** - Captures all DOM, user, and system events
- **Chrome DevTools Protocol (CDP)** - Deep browser integration for input tracking
- **Network Monitoring** - AJAX/XHR request interception and analysis
- **PrestaShop Integration** - Native PrestaShop API hooks and events

### 🎨 User Interface
- **Draggable Widget** - Moveable on-page interface with position persistence
- **Real-time Statistics** - Live event count, error tracking, significance scoring
- **Visual Indicators** - Recording status, LLM readiness, monitoring health
- **Responsive Design** - Works on all screen sizes with automatic positioning

### 🤖 LLM Integration
- **Claude Code Format** - Optimized output for AI analysis
- **Automation Script Generation** - Playwright/Selenium script generation
- **Pattern Recognition** - UX issue detection and flow analysis
- **Significance Scoring** - AI-weighted event importance

### 💾 Data Persistence
- **localStorage** - Widget position and user preferences
- **chrome.storage** - Session data and recordings
- **Graceful Degradation** - Fallback mechanisms for API failures
- **Cross-session Continuity** - State restoration on page reload

## 📁 File Structure

### Core Files
```
manifest.json              # Extension manifest (Manifest V3)
content-script-enhanced.js  # Main content script with Universal Monitor
background-enhanced.js      # Service worker with CDP integration
popup-enhanced.html         # Extension popup interface
popup-enhanced.js          # Popup controller logic
```

### Utilities
```
universal-monitor.js        # Standalone Universal Monitor
cdp-input-monitor.js       # CDP input field monitoring
```

### Legacy/Archive
```
archive/                   # Historical files and old versions
```

## 🔧 Installation

1. **Enable Developer Mode** in Chrome Extensions (chrome://extensions/)
2. **Load Unpacked** and select this directory
3. **Navigate** to any PrestaShop site (optimized for localhost:8082)
4. **Widget appears** automatically with drag & drop capability

## 🎮 Usage

### Basic Recording
1. **Start Recording** - Click widget button or use popup
2. **Interact** with the page normally
3. **Stop Recording** - Session data auto-saved to ~/Downloads/prestashop-debug/recordings/enhanced/

### Advanced Features
- **Drag Widget** - Click and drag header to reposition
- **CDP Monitoring** - Automatic input field tracking
- **LLM Reports** - Generated analysis for Claude Code
- **Pattern Analysis** - UX flow and automation opportunities

## 🔍 Data Output

### Session Files
```json
{
  "meta": {
    "sessionId": "session-2025-07-29T024919-v6h6ptis4",
    "url": "http://localhost:8082/...",
    "duration": 9492,
    "enhancedMode": true
  },
  "actions": [...],
  "llmReport": {...},
  "claudeCodeFormat": {...}
}
```

### LLM Integration
- **User Flow Analysis** - Step-by-step interaction breakdown
- **Element Significance** - AI-weighted importance scoring
- **Automation Opportunities** - Script generation ready data
- **UX Issue Detection** - Pattern-based problem identification

## 🛠️ Technical Details

### Architecture
- **Manifest V3** - Modern Chrome extension architecture
- **Service Worker** - Background processing with CDP
- **Content Script** - Page-level event monitoring
- **Universal Monitor** - Cross-browser event system

### Performance
- **Event Batching** - Optimized data processing
- **Memory Management** - Automatic cleanup and state management
- **Error Handling** - Graceful degradation and recovery
- **Extension Context** - Invalidation protection

### Security
- **CSP Compliant** - Content Security Policy adherence
- **Minimal Permissions** - Only required Chrome APIs
- **Data Isolation** - Secure cross-frame communication
- **Privacy Focused** - Local storage only, no external calls

## 🐛 Debugging

### Common Issues
- **Widget Not Appearing** - Check console for DOM ready errors
- **Recording Not Starting** - Verify extension permissions
- **Position Not Saving** - Check localStorage availability
- **CDP Errors** - Ensure Chrome debugging enabled

### Error Checking
```bash
node simple-error-check.js  # Check extension errors via CDP
```

### Console Logs
- `🚀 Starting Enhanced PrestaShop Recorder initialization...`
- `✅ Enhanced PrestaShop Recorder fully initialized`
- `Widget position saved: 123x456`

## 📊 Session Analysis

Latest recorded action from your session:
- **Type**: modal_interaction
- **Element**: #blockcart-modal (Product added to cart)
- **Significance**: 0.5
- **Status**: ✅ Successfully captured

## 🎯 Next Steps
1. Test recording on http://localhost:8082/login
2. Verify password field detection
3. Generate automation scripts
4. Analyze UX patterns

---

**Version**: 2.0.0  
**Last Updated**: July 29, 2025  
**Status**: Production Ready ✅