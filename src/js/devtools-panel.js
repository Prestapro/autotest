// PrestaShop Debug Pro Enhanced - DevTools Panel Controller

class DevToolsPanelController {
    constructor() {
        this.logElement = document.getElementById('debug-log');
        this.recordingStatusEl = document.getElementById('recording-status');
        this.recordingTextEl = document.getElementById('recording-text');
        
        document.getElementById('advanced-tracking-btn')?.addEventListener('click', toggleAdvancedTracking);
        document.getElementById('clear-events-btn')?.addEventListener('click', clearTrackedEvents);
        
        this.setupPersistentConnection();
        this.log('🚀 DevTools Panel initialized');
    }
    
    setupPersistentConnection() {
        this.port = chrome.runtime.connect({ name: 'devtools-panel' });
        
        this.port.onMessage.addListener((message) => {
            if (message.action === 'tab_state_update') {
                this.updateRecordingStatus(message.state);
            }
        });
        
        this.port.onDisconnect.addListener(() => {
            // Пассивно переподключаемся без ошибок
            setTimeout(() => this.setupPersistentConnection(), 1000);
        });
    }
    
    updateRecordingStatus(state) {
        const isRecording = state?.recording || false;
        this.recordingStatusEl.className = `status-indicator ${isRecording ? 'status-active' : 'status-inactive'}`;
        this.recordingTextEl.textContent = isRecording ? 'Active' : 'Inactive';
    }
    
    log(message) {
        const timestamp = new Date().toLocaleTimeString();
        this.logElement.textContent += `[${timestamp}] ${message}\n`;
        this.logElement.scrollTop = this.logElement.scrollHeight;
    }
    
    async executeInPage(code) {
        return new Promise((resolve) => {
            chrome.devtools.inspectedWindow.eval(code, function(result, isException) {
                if (isException) {
                    console.error('Page execution error:', result);
                    resolve({ error: result });
                } else {
                    resolve({ result });
                }
            });
        });
    }
}

const controller = new DevToolsPanelController();

// Глобальные функции для кнопок
window.analyzePrestaShop = async function() {
    controller.log('🔍 Analyzing PrestaShop structure...');
    
    const result = await controller.executeInPage(`
        (function() {
            const info = {
                isPrestaShop: false,
                version: null,
                modules: [],
                hooks: [],
                forms: [],
                cart: null
            };
            
            // Detect PrestaShop
            if (window.prestashop || document.querySelector('meta[name="generator"][content*="PrestaShop"]')) {
                info.isPrestaShop = true;
            }
            
            // Get version
            const versionMeta = document.querySelector('meta[name="generator"]');
            if (versionMeta) {
                const match = versionMeta.content.match(/PrestaShop\\s+([\\d.]+)/);
                info.version = match ? match[1] : 'Unknown';
            }
            
            // Find modules
            info.modules = Array.from(document.querySelectorAll('[class*="ps-"], [class*="module-"]'))
                .map(el => el.className)
                .slice(0, 10);
            
            // Find hooks
            info.hooks = Array.from(document.querySelectorAll('[data-hook-name]'))
                .map(el => el.getAttribute('data-hook-name'))
                .slice(0, 10);
            
            // Find forms
            info.forms = Array.from(document.forms).map(form => ({
                action: form.action,
                method: form.method,
                fieldCount: form.elements.length
            })).slice(0, 5);
            
            return info;
        })()
    `);
    
    if (result.result) {
        const info = result.result;
        controller.log(`✅ PrestaShop detected: ${info.isPrestaShop}`);
        controller.log(`📦 Version: ${info.version || 'Unknown'}`);
        controller.log(`🔌 Modules found: ${info.modules.length}`);
        controller.log(`⚡ Hooks found: ${info.hooks.length}`);
        controller.log(`📝 Forms found: ${info.forms.length}`);
    } else {
        controller.log('❌ Failed to analyze PrestaShop');
    }
};

window.findForms = async function() {
    controller.log('📝 Analyzing forms...');
    
    const result = await controller.executeInPage(`
        Array.from(document.forms).map((form, index) => ({
            index: index,
            action: form.action,
            method: form.method,
            id: form.id,
            name: form.name,
            fields: Array.from(form.elements).map(el => ({
                name: el.name,
                type: el.type,
                required: el.required
            }))
        }))
    `);
    
    if (result.result) {
        result.result.forEach((form, i) => {
            controller.log(`Form ${i + 1}: ${form.method.toUpperCase()} ${form.action}`);
            controller.log(`  Fields: ${form.fields.length} (${form.fields.filter(f => f.required).length} required)`);
        });
    }
};

window.analyzeCart = async function() {
    controller.log('🛒 Analyzing cart elements...');
    
    const result = await controller.executeInPage(`
        (function() {
            const cartElements = document.querySelectorAll('[class*="cart"], [id*="cart"], [data-cart]');
            return Array.from(cartElements).map(el => ({
                tagName: el.tagName,
                id: el.id,
                className: el.className,
                text: el.textContent.trim().substring(0, 50)
            })).slice(0, 10);
        })()
    `);
    
    if (result.result) {
        controller.log(`🛒 Found ${result.result.length} cart-related elements`);
        result.result.forEach(el => {
            controller.log(`  ${el.tagName}#${el.id}: ${el.text}`);
        });
    }
};

window.findHooks = async function() {
    controller.log('⚡ Finding PrestaShop hooks...');
    
    const result = await controller.executeInPage(`
        Array.from(document.querySelectorAll('[data-hook-name]')).map(el => ({
            hook: el.getAttribute('data-hook-name'),
            tagName: el.tagName,
            id: el.id,
            className: el.className
        }))
    `);
    
    if (result.result) {
        controller.log(`⚡ Found ${result.result.length} PrestaShop hooks`);
        result.result.forEach(hook => {
            controller.log(`  Hook: ${hook.hook} (${hook.tagName})`);
        });
    }
};

window.startRecording = async function() {
    controller.log('🔴 Starting enhanced recording...');
    try {
        if (!chrome.runtime?.id) {
            controller.log('❌ Extension context invalidated - please reload DevTools');
            return;
        }
        await chrome.runtime.sendMessage({ action: 'start_devtools_recording' });
        controller.log('✅ Recording started from DevTools');
    } catch (error) {
        controller.log('❌ Failed to start recording: ' + error.message);
    }
};

window.stopRecording = async function() {
    controller.log('⏸️ Stopping enhanced recording...');
    try {
        if (!chrome.runtime?.id) {
            controller.log('❌ Extension context invalidated - please reload DevTools');
            return;
        }
        await chrome.runtime.sendMessage({ action: 'stop_devtools_recording' });
        controller.log('✅ Recording stopped from DevTools');
    } catch (error) {
        controller.log('❌ Failed to stop recording: ' + error.message);
    }
};

window.showWidget = async function() {
    controller.log('📱 Showing debug widget...');
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.tabs.sendMessage(tab.id, { action: 'show_widget' });
        controller.log('✅ Debug widget shown');
    } catch (error) {
        controller.log('❌ Failed to show widget: ' + error.message);
    }
};

window.hideWidget = async function() {
    controller.log('📱 Hiding debug widget...');
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.tabs.sendMessage(tab.id, { action: 'hide_widget' });
        controller.log('✅ Debug widget hidden');
    } catch (error) {
        controller.log('❌ Failed to hide widget: ' + error.message);
    }
};

window.toggleWidget = async function() {
    controller.log('🔄 Toggling debug widget...');
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.tabs.sendMessage(tab.id, { action: 'toggle_widget' });
        controller.log('✅ Debug widget toggled');
    } catch (error) {
        controller.log('❌ Failed to toggle widget: ' + error.message);
    }
};

window.simulateUserFlow = async function() {
    controller.log('🎭 Simulating user flow...');
    
    const result = await controller.executeInPage(`
        (function() {
            const steps = [];
            
            // Simulate clicks on common PrestaShop elements
            const clickTargets = [
                'button[type="submit"]',
                '.btn-primary',
                '.add-to-cart',
                '.product-add-to-cart'
            ];
            
            clickTargets.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    steps.push('Found ' + elements.length + ' elements for: ' + selector);
                }
            });
            
            return steps;
        })()
    `);
    
    if (result.result) {
        controller.log('🎭 User flow simulation results:');
        result.result.forEach(step => controller.log('  ' + step));
    }
};

window.generateSelectors = async function() {
    controller.log('🎯 Generating CSS selectors...');
    
    const result = await controller.executeInPage(`
        (function() {
            const selectors = [];
            
            // Common PrestaShop elements
            const elements = document.querySelectorAll(
                'button, input[type="submit"], .btn, [class*="add-to-cart"], [class*="product"]'
            );
            
            Array.from(elements).slice(0, 20).forEach(el => {
                let selector = el.tagName.toLowerCase();
                if (el.id) selector += '#' + el.id;
                if (el.className) selector += '.' + el.className.split(' ')[0];
                
                selectors.push({
                    selector: selector,
                    text: el.textContent.trim().substring(0, 30),
                    tag: el.tagName
                });
            });
            
            return selectors;
        })()
    `);
    
    if (result.result) {
        controller.log('🎯 Generated selectors:');
        result.result.forEach(item => {
            controller.log(`  ${item.selector} // ${item.text}`);
        });
    }
};

window.exportForPlaywright = async function() {
    controller.log('🎪 Generating Playwright code...');
    
    const playwrightCode = `
// Generated Playwright test for PrestaShop
const { test, expect } = require('@playwright/test');

test('PrestaShop interaction test', async ({ page }) => {
    await page.goto('${window.location.href}');
    
    // Wait for PrestaShop to load
    await page.waitForSelector('body');
    
    // Example interactions (customize based on your needs)
    const addToCartButton = page.locator('.add-to-cart, .btn-primary');
    if (await addToCartButton.count() > 0) {
        await addToCartButton.first().click();
    }
    
    // Take screenshot
    await page.screenshot({ path: 'prestashop-test.png' });
});
    `.trim();
    
    try {
        await navigator.clipboard.writeText(playwrightCode);
        controller.log('✅ Playwright code copied to clipboard');
    } catch (error) {
        controller.log('❌ Failed to copy to clipboard');
        controller.log(playwrightCode);
    }
};

window.copyClaudeInstructions = async function() {
    controller.log('🤖 Generating Claude Code instructions...');
    
    const instructions = `
# Claude Code - PrestaShop Debug Analysis

## Current Page Analysis
URL: ${window.location.href}
Generated: ${new Date().toISOString()}

## Summary Files (New!)
Enhanced Debug Pro now generates compact automation files:
- \`*-summary.json\`: Compact automation data (10-50KB vs 500KB+)
- Optimized selectors, form data, navigation flow
- Ready for Playwright/Puppeteer without analysis

## Quick Commands
\`\`\`bash
# Navigate to recordings
cd ~/Downloads/prestashop-debug/recordings/enhanced

# Find latest session files
ls -la *summary.json | tail -1    # Compact automation data
ls -la session-*.json | tail -1   # Full session data

# Analyze summary for automation
cat latest-summary.json | jq '.automationFlow'
cat latest-summary.json | jq '.selectors'
cat latest-summary.json | jq '.visitedUrls'

# Quick automation script generation
cat latest-summary.json | jq '.formData'
\`\`\`

## Questions for Claude Code
1. "Use the summary.json to create Playwright automation without analyzing the full session"
2. "Extract real URLs and selectors from the CDP data in summary.json"
3. "Generate automation based on visitedUrls and automationFlow sections"  
4. "Create form filling scripts using the formData section"

## Enhanced Debug Pro Features
- ✅ Universal event monitoring active
- ✅ LLM-optimized recording format
- ✅ Drag & drop widget (show/hide with DevTools)
- 🆕 Automated summary.json generation for faster automation
- 🆕 Real URL and selector extraction  
- 🆕 Compact automation-focused data export
- 📊 CDP disabled by default for stability (enable in settings if needed)
    `.trim();
    
    try {
        await navigator.clipboard.writeText(instructions);
        controller.log('✅ Claude instructions copied to clipboard');
    } catch (error) {
        controller.log('❌ Failed to copy to clipboard');
        controller.log(instructions);
    }
};

window.clearLog = function() {
    controller.logElement.textContent = 'Debug log cleared...\n';
};

// ADVANCED TRACKING FUNCTIONS
let isAdvancedTracking = false;

window.toggleAdvancedTracking = async function() {
    const btn = document.getElementById('advanced-tracking-btn');
    
    if (!isAdvancedTracking) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.tabs.sendMessage(tab.id, { action: 'start_advanced_tracking' });
        
        btn.textContent = 'Stop Advanced Tracking';
        btn.style.background = '#f44336';
        isAdvancedTracking = true;
        
        document.getElementById('events-container').innerHTML = '<div>🎯 Advanced tracking active...</div>';
    } else {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.tabs.sendMessage(tab.id, { action: 'stop_advanced_tracking' });
        
        btn.textContent = 'Start Advanced Tracking';
        btn.style.background = '';
        isAdvancedTracking = false;
    }
};

window.clearTrackedEvents = async function() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tab.id, { action: 'clear_tracked_events' });
    
    document.getElementById('events-container').innerHTML = '<div>Events cleared</div>';
};

// Listen for tracked events
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'devtools_event' && message.event) {
        displayTrackedEvent(message.event);
    }
});

function displayTrackedEvent(event) {
    const container = document.getElementById('events-container');
    
    const eventDiv = document.createElement('div');
    eventDiv.style.cssText = 'border-bottom: 1px solid #eee; padding: 5px 0;';
    
    const time = new Date(event.timestamp).toLocaleTimeString();
    const typeColor = getEventTypeColor(event.type);
    
    eventDiv.innerHTML = `
        <div style="color: ${typeColor}; font-weight: bold;">[${time}] ${event.type}</div>
        <div>Selector: <code>${event.selector}</code></div>
        ${event.element.text ? `<div>Text: "${event.element.text}"</div>` : ''}
        ${event.data.value ? `<div>Value: "${event.data.value}"</div>` : ''}
        <div style="font-size: 10px; color: #666;">${event.url}</div>
    `;
    
    container.appendChild(eventDiv);
    container.scrollTop = container.scrollHeight;
    
    // Limit displayed events
    while (container.children.length > 50) {
        container.removeChild(container.firstChild);
    }
}

function getEventTypeColor(type) {
    const colors = {
        'CLICK': '#007cba',
        'INPUT': '#4CAF50', 
        'CHANGE': '#ff9800',
        'MODAL_SHOW': '#9c27b0',
        'URL_CHANGE': '#f44336'
    };
    window.testCDP = async function() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        try {
            await chrome.debugger.attach({ tabId: tab.id }, '1.3');
            console.log('✅ CDP attached to localhost!');
            
            await chrome.debugger.sendCommand({ tabId: tab.id }, 'DOM.enable');
            console.log('✅ CDP DOM enabled');
            
            chrome.debugger.detach({ tabId: tab.id });
        } catch (error) {
            console.error('❌ CDP failed:', error);
        }
    };