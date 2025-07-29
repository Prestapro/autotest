// PrestaShop Debug Pro Enhanced - Popup Controller
// Universal Monitor + CDP + LLM Integration

class EnhancedPopupController {
    constructor() {
        this.isRecording = false;
        this.isPaused = false;
        this.sessionData = null;
        this.startTime = null;
        this.durationInterval = null;
        this.cdpActive = false;
        this.universalActive = false;
        
        // init() теперь вызывается из DOMContentLoaded
    }

    async init() {
        this.setupEventListeners();
        
        // ИСПРАВЛЕНИЕ: Ждем готовности всех скриптов
        await this.waitForScriptsReady();
        
        this.loadEnhancedState();
        this.updateUI();
        this.detectPrestaShop();
        this.checkMonitoringStatus();
        
        // Health check every 10 seconds
        setInterval(() => {
            this.checkMonitoringStatus();
        }, 10000);
    }
    
    // НОВЫЙ: Ожидание готовности скриптов
    async waitForScriptsReady() {
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            try {
                // Проверяем background script
                const bgReady = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
                        resolve(!chrome.runtime.lastError);
                    });
                });
                
                if (bgReady) {
                    console.log('✅ Scripts ready');
                    return;
                }
            } catch (error) {
                console.warn(`Attempt ${attempts + 1}: Scripts not ready`);
            }
            
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        console.warn('⚠️ Scripts may not be fully ready');
    }

    setupEventListeners() {
        // Enhanced recording controls
        document.getElementById('start-recording')?.addEventListener('click', () => {
            this.startEnhancedRecording();
        });

        document.getElementById('pause-recording')?.addEventListener('click', () => {
            this.togglePauseRecording();
        });

        document.getElementById('stop-recording')?.addEventListener('click', () => {
            this.stopEnhancedRecording();
        });

        document.getElementById('generate-llm')?.addEventListener('click', () => {
            this.generateLLMReport();
        });

        // Enhanced actions
        document.getElementById('take-screenshot')?.addEventListener('click', () => {
            this.takeScreenshot();
        });

        document.getElementById('export-enhanced')?.addEventListener('click', () => {
            this.exportEnhancedSession();
        });

        document.getElementById('analyze-patterns')?.addEventListener('click', () => {
            this.analyzePatterns();
        });

        document.getElementById('generate-automation')?.addEventListener('click', () => {
            this.generateAutomationScript();
        });

        document.getElementById('claude-code-format')?.addEventListener('click', () => {
            this.generateClaudeCodeFormat();
        });

        document.getElementById('open-recordings')?.addEventListener('click', () => {
            this.openRecordingsFolder();
        });
    }

    async loadEnhancedState() {
        try {
            // ИСПРАВЛЕНИЕ: Проверяем chrome.runtime до запросов
            if (!chrome.runtime?.id) {
                console.warn('Extension context invalidated');
                this.showContentScriptError();
                return;
            }
            
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                console.warn('No active tab found');
                return;
            }

            await this.ensureEnhancedContentScript(tab);
            
            // Простая проверка без таймаутов
            try {
                const response = await chrome.tabs.sendMessage(tab.id, { action: 'get_enhanced_state' });
                
                if (response && response.enhancedMode) {
                    this.isRecording = response.recording;
                    this.isPaused = response.paused;
                    this.sessionData = response.sessionData;
                    this.startTime = response.startTime;
                    this.updateUI();
                    this.updateEnhancedStats();
                    console.log('✅ Enhanced state loaded');
                } else {
                    console.warn('Enhanced recorder not ready');
                }
            } catch (messageError) {
                console.warn('Content script not responding:', messageError.message);
                this.showContentScriptError();
            }
            
        } catch (error) {
            console.error('Enhanced state load failed:', error);
            this.showContentScriptError();
        }
    }

    async ensureEnhancedContentScript(tab) {
        try {
            // ИСПРАВЛЕНИЕ: Просто инжектим, не проверяем
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content-script-enhanced.js']
            });
            
            await new Promise(resolve => setTimeout(resolve, 500));
            console.log('✅ Content script injected');
            
        } catch (error) {
            console.warn('Content script injection failed:', error.message);
        }
    }

    async detectPrestaShop() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            const result = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: () => {
                    const info = {
                        isPrestaShop: false,
                        version: null,
                        adminPanel: false,
                        url: window.location.href,
                        enhancedMonitor: !!window.enhancedPrestaShopRecorder,
                        universalMonitor: !!window.universalMonitor
                    };

                    // Enhanced PrestaShop detection
                    if (window.prestashop || 
                        document.querySelector('meta[name="generator"][content*="PrestaShop"]') ||
                        window.location.href.includes('prestashop') ||
                        document.querySelector('.prestashop, #prestashop')) {
                        info.isPrestaShop = true;
                    }

                    // Admin panel detection
                    if (window.location.href.includes('/admin') || 
                        document.querySelector('.adminbody, #admin, .admin-panel')) {
                        info.adminPanel = true;
                    }

                    // Version detection
                    const versionMeta = document.querySelector('meta[name="generator"]');
                    if (versionMeta) {
                        const content = versionMeta.getAttribute('content');
                        const versionMatch = content.match(/PrestaShop\\s+(\\d+\\.\\d+\\.\\d+)/i);
                        if (versionMatch) {
                            info.version = versionMatch[1];
                        }
                    }

                    return info;
                }
            });

            const info = result[0].result;
            this.updateEnhancedPrestaShopInfo(info);
            
        } catch (error) {
            console.error('Enhanced PrestaShop detection failed:', error);
        }
    }

    updateEnhancedPrestaShopInfo(info) {
        const infoEl = document.getElementById('prestashop-info');
        
        if (info.isPrestaShop) {
            infoEl.className = 'prestashop-info detected';
            infoEl.innerHTML = `
                <strong>✅ PrestaShop Enhanced Ready</strong><br>
                ${info.version ? `Version: ${info.version}<br>` : ''}
                ${info.adminPanel ? 'Admin Panel: Yes<br>' : ''}
                Enhanced Monitor: ${info.enhancedMonitor ? '✅' : '❌'}<br>
                Universal Monitor: ${info.universalMonitor ? '✅' : '❌'}
            `;
        } else {
            infoEl.className = 'prestashop-info';
            infoEl.innerHTML = `
                <strong>🔍 Enhanced Monitor Active</strong><br>
                Works on any site with full event detection<br>
                Enhanced Mode: ${info.enhancedMonitor ? '✅' : '❌'}
            `;
        }
    }

    async checkMonitoringStatus() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Check CDP status - ИСПРАВЛЕННАЯ версия
            try {
                const cdpResponse = await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('CDP status check timeout'));
                    }, 2000);
                    
                    chrome.runtime.sendMessage({ action: 'get_cdp_status' }, (response) => {
                        clearTimeout(timeout);
                        
                        if (chrome.runtime.lastError) {
                            console.warn('CDP status check error:', chrome.runtime.lastError.message);
                            reject(new Error(chrome.runtime.lastError.message));
                            return;
                        }
                        
                        resolve(response);
                    });
                });
                
                this.cdpActive = cdpResponse?.active || false;
            } catch (error) {
                console.warn('CDP status check failed:', error.message);
                this.cdpActive = false;
            }
            
            this.updateMonitoringStatusUI();
            
            // Check Universal Monitor status
            try {
                const response = await chrome.tabs.sendMessage(tab.id, { action: 'get_universal_status' });
                this.universalActive = response?.active || false;
                this.updateMonitoringStatusUI();
            } catch (error) {
                this.universalActive = false;
                this.updateMonitoringStatusUI();
            }
            
        } catch (error) {
            console.error('Monitoring status check failed:', error);
        }
    }

    updateMonitoringStatusUI() {
        // CDP Status
        const cdpStatus = document.getElementById('cdp-status');
        if (cdpStatus) {
            const indicator = cdpStatus.querySelector('.status-indicator');
            if (this.cdpActive) {
                indicator.className = 'status-indicator active';
                cdpStatus.innerHTML = '<span class="status-indicator active"></span>Active';
            } else {
                indicator.className = 'status-indicator inactive';
                cdpStatus.innerHTML = '<span class="status-indicator inactive"></span>Inactive';
            }
        }

        // Universal Monitor Status
        const universalStatus = document.getElementById('universal-status');
        if (universalStatus) {
            const indicator = universalStatus.querySelector('.status-indicator');
            if (this.universalActive) {
                indicator.className = 'status-indicator active';
                universalStatus.innerHTML = '<span class="status-indicator active"></span>Active';
            } else {
                indicator.className = 'status-indicator inactive';
                universalStatus.innerHTML = '<span class="status-indicator inactive"></span>Standby';
            }
        }
    }

    async startEnhancedRecording() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // ИСПРАВЛЕНИЕ: Надежная отправка сообщения с обработкой runtime.lastError
            const response = await new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(tab.id, { action: 'start_enhanced_recording' }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.warn('Start recording message error:', chrome.runtime.lastError.message);
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }
                    resolve(response);
                });
            });
            
            if (response?.success) {
                this.isRecording = true;
                this.startTime = Date.now();
                this.startDurationTimer();
                this.updateUI();
                this.showNotification('Enhanced recording started! 🚀', 'success');
            } else {
                throw new Error('Content script did not confirm recording start');
            }
            
        } catch (error) {
            console.error('Enhanced recording start failed:', error);
            this.showNotification('Failed to start enhanced recording - refresh page if needed', 'error');
            this.showContentScriptError();
        }
    }

    async stopEnhancedRecording() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // ИСПРАВЛЕНИЕ: Надежная отправка с обработкой runtime.lastError
            const response = await new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(tab.id, { action: 'stop_enhanced_recording' }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.warn('Stop recording message error:', chrome.runtime.lastError.message);
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }
                    resolve(response);
                });
            });
            
            if (response?.success) {
                this.isRecording = false;
                this.stopDurationTimer();
                this.updateUI();
                this.showNotification('Enhanced recording stopped! Ready for LLM analysis 📊', 'success');
                
                // Auto-enable LLM report button
                document.getElementById('generate-llm').disabled = false;
            } else {
                throw new Error('Content script did not confirm recording stop');
            }
            
        } catch (error) {
            console.error('Enhanced recording stop failed:', error);
            this.showNotification('Failed to stop enhanced recording - refresh page if needed', 'error');
            this.showContentScriptError();
        }
    }

    async togglePauseRecording() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            const action = this.isPaused ? 'resume_enhanced_recording' : 'pause_enhanced_recording';
            
            const response = await new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(tab.id, { action }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.warn('Pause toggle message error:', chrome.runtime.lastError.message);
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }
                    resolve(response);
                });
            });
            
            if (response?.success) {
                this.isPaused = !this.isPaused;
                this.updateUI();
                this.showNotification(this.isPaused ? 'Recording paused ⏸️' : 'Recording resumed 🔴', 'info');
            }
            
        } catch (error) {
            console.error('Enhanced pause toggle failed:', error);
        }
    }

    async generateLLMReport() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            const response = await new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(tab.id, { action: 'generate_llm_report' }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.warn('LLM report message error:', chrome.runtime.lastError.message);
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }
                    resolve(response);
                });
            });
            
            if (response?.success && response.report) {
                // Create comprehensive LLM report
                const llmReport = this.formatLLMReport(response.report);
                
                // Download as file
                await this.downloadTextFile(llmReport, `llm-analysis-${Date.now()}.md`);
                
                this.showNotification('LLM report generated! 🤖', 'success');
            }
            
        } catch (error) {
            console.error('LLM report generation failed:', error);
            this.showNotification('Failed to generate LLM report', 'error');
        }
    }

    formatLLMReport(report) {
        return `# PrestaShop Enhanced Session Analysis Report

## 📊 Session Summary
- **Total Events**: ${report.summary.totalEvents}
- **Duration**: ${Math.round(report.summary.duration / 1000)}s
- **Average Significance**: ${report.summary.avgSignificance.toFixed(2)}
- **Page Changes**: ${report.summary.pageChanges}

## 🎯 User Actions Sequence
${report.actionSequence.map((action, i) => 
    `${i + 1}. **${action.action}** (${action.time}ms) - Significance: ${action.significance}`
).join('\\n')}

## 🔍 Event Categories
${Object.entries(report.summary.categories).map(([category, count]) => 
    `- **${category}**: ${count} events`
).join('\\n')}

## 🚀 Automation Opportunities
${report.insights.potentialIssues.map(issue => 
    `- ${issue}`
).join('\\n')}

## 🎯 Most Active Elements
${report.insights.mostActiveElements.map(([element, count]) => 
    `- **${element}**: ${count} interactions`
).join('\\n')}

## 🤖 Claude Code Instructions

### Quick Analysis
\`\`\`bash
cd ~/Downloads/prestashop-debug/recordings/enhanced
ls -la *.json | tail -1
\`\`\`

### Deep Analysis Script
\`\`\`javascript
const session = require('./latest-session.json');
console.log('Session insights:', session.llmReport.insights);
console.log('Automation script:', session.claudeCodeFormat.automationScript);
\`\`\`

---
*Generated by PrestaShop Debug Pro Enhanced v2.0*
`;
    }

    async analyzePatterns() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            const response = await new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(tab.id, { action: 'analyze_user_patterns' }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.warn('Pattern analysis message error:', chrome.runtime.lastError.message);
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }
                    resolve(response);
                });
            });
            
            if (response?.patterns) {
                const analysis = this.generatePatternAnalysis(response.patterns);
                await this.downloadTextFile(analysis, `pattern-analysis-${Date.now()}.md`);
                this.showNotification('Pattern analysis generated! 📈', 'success');
            }
            
        } catch (error) {
            console.error('Pattern analysis failed:', error);
            this.showNotification('Failed to analyze patterns', 'error');
        }
    }

    generatePatternAnalysis(patterns) {
        return `# User Pattern Analysis

## 🔄 Repeated Actions
${patterns.repeatedActions?.map(action => 
    `- ${action.type}: ${action.count} times`
).join('\\n') || 'No repeated actions detected'}

## 🎯 User Flow Analysis
${patterns.userFlow?.map((step, i) => 
    `${i + 1}. ${step}`
).join('\\n') || 'Linear flow detected'}

## ⚠️ Potential UX Issues
${patterns.issues?.map(issue => 
    `- ${issue}`
).join('\\n') || 'No major UX issues detected'}

## 🤖 Automation Recommendations
${patterns.automationOpportunities?.map(opp => 
    `- ${opp.description}: ${opp.steps} steps`
).join('\\n') || 'No clear automation opportunities'}
`;
    }

    async generateAutomationScript() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            const response = await new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(tab.id, { action: 'generate_automation_script' }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.warn('Automation script message error:', chrome.runtime.lastError.message);
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }
                    resolve(response);
                });
            });
            
            if (response?.script) {
                await this.downloadTextFile(response.script, `automation-script-${Date.now()}.js`);
                this.showNotification('Automation script generated! 🤖', 'success');
            }
            
        } catch (error) {
            console.error('Automation script generation failed:', error);
            this.showNotification('Failed to generate automation script', 'error');
        }
    }

    async generateClaudeCodeFormat() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            const claudeInstructions = this.createClaudeCodeInstructions();
            await this.downloadTextFile(claudeInstructions, 'claude-code-instructions.md');
            
            this.showNotification('Claude Code instructions generated! 🚀', 'success');
            
        } catch (error) {
            console.error('Claude Code format generation failed:', error);
            this.showNotification('Failed to generate Claude Code format', 'error');
        }
    }

    createClaudeCodeInstructions() {
        return `# Claude Code - PrestaShop Enhanced Analysis

## 🎯 Quick Start
\`\`\`bash
cd ~/Downloads/prestashop-debug/recordings/enhanced
find . -name "*.json" -type f | head -1 | xargs cat | jq '.claudeCodeFormat'
\`\`\`

## 🔍 Analysis Commands

### 1. Session Overview
\`\`\`bash
# Find latest enhanced session
ls -la *.json | tail -1

# Extract key metrics
cat latest-session.json | jq '.meta'
\`\`\`

### 2. LLM Report Analysis
\`\`\`javascript
const session = require('./latest-session.json');
console.log('User Flow:', session.claudeCodeFormat.userFlow);
console.log('Automation Opportunities:', session.claudeCodeFormat.insights.potentialAutomations);
\`\`\`

### 3. Generate Tests
\`\`\`javascript
const automation = session.claudeCodeFormat.automationScript;
console.log('Playwright Script:');
console.log(automation);
\`\`\`

## 🎯 Questions to Ask Claude Code
1. "Analyze the user flow and suggest optimizations"
2. "Generate comprehensive Playwright tests from this session"
3. "Find UX issues and propose solutions"
4. "Create automation scripts for repetitive tasks"

## 🚀 Advanced Analysis
Use the enhanced session data with Claude Code for deep insights into PrestaShop user behavior and automation opportunities.
`;
    }

    async openRecordingsFolder() {
        try {
            // This would ideally open the folder, but browsers have limitations
            // Instead, show instructions
            const instructions = `
# Open Recordings Folder

Navigate to:
~/Downloads/prestashop-debug/recordings/enhanced/

Or run:
\`\`\`bash
open ~/Downloads/prestashop-debug/recordings/enhanced/
\`\`\`

Your enhanced session files are saved there in JSON format.
            `;
            
            this.showNotification('Check ~/Downloads/prestashop-debug/recordings/enhanced/', 'info');
            
        } catch (error) {
            console.error('Failed to open recordings folder:', error);
        }
    }

    updateEnhancedStats() {
        if (this.sessionData) {
            document.getElementById('action-count').textContent = 
                this.sessionData.actions?.length || 0;
            document.getElementById('error-count').textContent = 
                this.sessionData.errors?.length || 0;
            
            // Calculate significance score
            const actions = this.sessionData.actions || [];
            const avgSignificance = actions.length > 0 
                ? actions.reduce((sum, a) => sum + (a.significance || 0.5), 0) / actions.length 
                : 0;
            document.getElementById('significance-score').textContent = avgSignificance.toFixed(1);
            
            // LLM Ready status
            const llmReady = actions.length > 5;
            const llmReadyEl = document.getElementById('llm-ready');
            if (llmReadyEl) {
                const indicator = llmReadyEl.querySelector('.status-indicator');
                llmReadyEl.innerHTML = `${llmReady ? 'Yes' : 'No'} <span class="status-indicator ${llmReady ? 'active' : 'inactive'}"></span>`;
            }
            
            // Enable/disable LLM button
            document.getElementById('generate-llm').disabled = !llmReady;
        }
    }

    startDurationTimer() {
        this.durationInterval = setInterval(() => {
            this.updateDuration();
        }, 1000);
    }

    stopDurationTimer() {
        if (this.durationInterval) {
            clearInterval(this.durationInterval);
            this.durationInterval = null;
        }
    }

    updateDuration() {
        if (this.startTime) {
            const elapsed = Date.now() - this.startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            
            document.getElementById('duration').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    updateUI() {
        // Recording status
        const statusEl = document.getElementById('recording-status');
        const startBtn = document.getElementById('start-recording');
        const pauseBtn = document.getElementById('pause-recording');
        const stopBtn = document.getElementById('stop-recording');
        
        if (this.isRecording) {
            if (this.isPaused) {
                statusEl.textContent = '⏸️ Enhanced Recording Paused';
                statusEl.className = 'recording-status paused';
                startBtn.disabled = true;
                pauseBtn.disabled = false;
                pauseBtn.textContent = '▶️ Resume';
                stopBtn.disabled = false;
            } else {
                statusEl.textContent = '🔴 Enhanced Recording Active';
                statusEl.className = 'recording-status active';
                startBtn.disabled = true;
                pauseBtn.disabled = false;
                pauseBtn.textContent = '⏸️ Pause';
                stopBtn.disabled = false;
            }
        } else {
            statusEl.textContent = '⏸️ Enhanced Recording Inactive';
            statusEl.className = 'recording-status inactive';
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            stopBtn.disabled = true;
        }
        
        // Session info
        if (this.sessionData) {
            document.getElementById('session-id').textContent = 
                this.sessionData.sessionId?.substr(-8) || '-';
            this.updateEnhancedStats();
        }
    }

    async takeScreenshot() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
                format: 'png',
                quality: 90
            });
            
            // Download screenshot
            const timestamp = Date.now();
            await chrome.downloads.download({
                url: dataUrl,
                filename: `prestashop-debug/screenshots/enhanced-screenshot-${timestamp}.png`,
                saveAs: false
            });
            
            this.showNotification('Screenshot captured! 📸', 'success');
            
        } catch (error) {
            console.error('Screenshot failed:', error);
            this.showNotification('Failed to capture screenshot', 'error');
        }
    }

    async exportEnhancedSession() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            const sessionData = await new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(tab.id, { action: 'get_enhanced_session_data' }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.warn('Export session message error:', chrome.runtime.lastError.message);
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }
                    resolve(response);
                });
            });
            
            if (sessionData) {
                chrome.runtime.sendMessage({
                    action: 'save_enhanced_session',
                    data: sessionData
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.warn('Save session message error:', chrome.runtime.lastError.message);
                    }
                });
                
                this.showNotification('Enhanced session exported! 💾', 'success');
            }
            
        } catch (error) {
            console.error('Enhanced export failed:', error);
            this.showNotification('Failed to export enhanced session', 'error');
        }
    }

    async downloadTextFile(content, filename) {
        try {
            const dataUrl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
            
            await chrome.downloads.download({
                url: dataUrl,
                filename: `prestashop-debug/${filename}`,
                saveAs: false
            });
        } catch (error) {
            console.error('Download failed:', error);
            chrome.runtime.sendMessage({
                action: 'download_text',
                content: content,
                filename: filename
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.warn('Download text message error:', chrome.runtime.lastError.message);
                }
            });
        }
    }

    showNotification(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Could implement toast notifications here
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            padding: 10px;
            border-radius: 5px;
            z-index: 10000;
            max-width: 300px;
            font-size: 12px;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    // НОВЫЙ МЕТОД: Обработка ошибок content script
    showContentScriptError() {
        const statusEl = document.getElementById('connection-status');
        if (statusEl) {
            statusEl.textContent = '❌ Content Script Not Ready';
            statusEl.className = 'connection-status error';
            statusEl.style.color = '#f44336';
        }
        
        // Показываем пользователю что делать
        this.showNotification('Content script loading... Refresh the page if needed', 'warning');
        
        // Отключаем кнопки пока не подключимся
        const buttons = ['start-recording', 'pause-recording', 'stop-recording'];
        buttons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = true;
        });
    }
}

// Initialize enhanced popup when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    const controller = new EnhancedPopupController();
    // Ждем завершения async init
    await controller.init();
});
