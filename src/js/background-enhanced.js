// PrestaShop Debug Pro Enhanced - Background Service Worker
// ИСПРАВЛЕННАЯ ВЕРСИЯ: Полная запись пользовательских действий + навигация

class EnhancedDebugProBackground {
    constructor() {
        this.sessions = new Map();
        this.cdpMonitor = null;
        this.biDiConnector = null;
        this.eventProcessors = new Map();
        this.navigationHistory = [];
        
        this.setupMessageHandlers();
        this.setupTabHandlers();
        this.initializeEnhancedMonitoring();
    }

    setupMessageHandlers() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch (message.action) {
                case 'save_enhanced_session':
                    this.saveEnhancedSessionData(message.data, sender.tab);
                    break;
                    
                case 'process_event_batch':
                    this.processEventBatch(message.events, sender.tab);
                    break;
                    
                case 'start_cdp_monitoring':
                    this.startCDPMonitoring(sender.tab);
                    break;
                    
                case 'user_action_recorded':
                    // НОВОЕ: Записываем все пользовательские действия
                    this.recordUserAction(message.data, sender.tab);
                    break;
                    
                case 'get_llm_formatted_data':
                    this.getLLMFormattedData(message.sessionId, sendResponse);
                    return true;
                    
                case 'generate_claude_code_format':
                    this.generateClaudeCodeFormat(message.sessionId, sendResponse);
                    return true;
                    
                case 'get_recording_status':
                    sendResponse({ recording: this.isRecording || false });
                    return true;
                    
                default:
                    console.log('Unknown enhanced message action:', message.action);
            }
        });
    }

    // ИСПРАВЛЕНИЕ: Полное отслеживание навигации
    setupTabHandlers() {
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            // Отслеживаем все изменения URL
            if (changeInfo.url && tab.url && 
                (tab.url.includes('localhost:8082') || tab.url.includes('localhost:8080'))) {
                
                this.recordNavigation(tab.url, tabId);
                
                // Отправляем navigation event в content script
                chrome.tabs.sendMessage(tabId, {
                    action: 'page_navigation',
                    url: tab.url,
                    previousUrl: changeInfo.url,
                    timestamp: Date.now()
                }).catch(() => {});
            }
            
            // ИСПРАВЛЕНИЕ: НЕ запускаем CDP автоматически для стабильности
            if (changeInfo.status === 'complete' && tab.url && 
                (tab.url.includes('localhost:8082') || tab.url.includes('localhost:8080'))) {
                console.log('✅ Page loaded, CDP monitoring available on-demand');
                // CDP будет запускаться только по запросу через DevTools
            }
        });
        
        chrome.tabs.onRemoved.addListener((tabId) => {
            if (this.cdpMonitor && this.cdpMonitor.tabId === tabId) {
                this.cdpMonitor.stop();
                this.cdpMonitor = null;
            }
        });
    }

    // НОВОЕ: Записываем навигацию
    recordNavigation(url, tabId) {
        this.navigationHistory.push({
            url: url,
            tabId: tabId,
            timestamp: Date.now(),
            type: 'navigation'
        });
        
        // Ограничиваем историю
        if (this.navigationHistory.length > 100) {
            this.navigationHistory = this.navigationHistory.slice(-50);
        }
    }

    // НОВОЕ: Записываем пользовательские действия в реальном времени
    recordUserAction(actionData, tab) {
        if (!this.currentSessionActions) {
            this.currentSessionActions = [];
        }
        
        // Обогащаем действие дополнительными данными
        const enrichedAction = {
            ...actionData,
            tabId: tab.id,
            tabUrl: tab.url,
            timestamp: Date.now(),
            sessionId: this.currentSessionId || `session-${Date.now()}`
        };
        
        this.currentSessionActions.push(enrichedAction);
        console.log('User action recorded:', enrichedAction.type, enrichedAction.element?.selector);
    }

    async saveEnhancedSessionData(sessionData, tab) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const filename = `${sessionData.meta.sessionId}-${timestamp}.json`;
            
            // ИСПРАВЛЕНИЕ: Добавляем навигационные данные
            const enhancedData = {
                ...sessionData,
                navigationHistory: this.navigationHistory.filter(nav => 
                    nav.timestamp >= (sessionData.meta.startTime || 0)
                ),
                userActions: this.currentSessionActions || []
            };
            
            // Обогащаем CDP данными
            if (this.cdpMonitor) {
                enhancedData.cdpData = {
                    inputFields: this.cdpMonitor.getInputFields(),
                    inputHistory: this.cdpMonitor.getInputHistory(),
                    networkEvents: this.cdpMonitor.getNetworkEvents()
                };
            }
            
            // Добавляем LLM-оптимизированное форматирование
            enhancedData.claudeCodeFormat = this.generateClaudeCodeFormatSync(enhancedData);
            
            // ИСПРАВЛЕНИЕ: Создаем ПРАВИЛЬНЫЙ summary для LLM
            const summaryData = this.generateLLMOptimizedSummary(enhancedData);
            
            // Сохраняем полный файл
            const fullJsonString = JSON.stringify(enhancedData, null, 2);
            const fullDataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(fullJsonString);
            
            await chrome.downloads.download({
                url: fullDataUrl,
                filename: `recordings/enhanced/${filename}`,
                saveAs: false
            });
            
            // Сохраняем LLM-оптимизированный summary
            const summaryFilename = `${sessionData.meta.sessionId}-summary.json`;
            const summaryJsonString = JSON.stringify(summaryData, null, 2);
            const summaryDataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(summaryJsonString);
            
            await chrome.downloads.download({
                url: summaryDataUrl,
                filename: `recordings/enhanced/${summaryFilename}`,
                saveAs: false
            });
            
            console.log(`Enhanced session saved: ${filename}`);
            console.log(`LLM Summary saved: ${summaryFilename}`);
            
            // Очищаем временные данные
            this.currentSessionActions = [];
            
        } catch (error) {
            console.error('Error saving enhanced session:', error);
        }
    }

    // ИСПРАВЛЕНИЕ: LLM-оптимизированный summary для воспроизведения
    generateLLMOptimizedSummary(sessionData) {
        const actions = sessionData.actions || [];
        const userActions = sessionData.userActions || [];
        const navigation = sessionData.navigationHistory || [];
        
        // Объединяем все действия в хронологическом порядке
        const allEvents = [
            ...actions.map(a => ({...a, source: 'dom_observer'})),
            ...userActions.map(a => ({...a, source: 'user_action'})),
            ...navigation.map(a => ({...a, source: 'navigation'}))
        ].sort((a, b) => a.timestamp - b.timestamp);
        
        // Извлекаем РЕАЛЬНЫЕ пользовательские действия
        const realUserActions = allEvents.filter(event => 
            event.source === 'user_action' || 
            ['click', 'input', 'change', 'submit', 'keydown', 'focus'].includes(event.type)
        );
        
        // Группируем по контексту для LLM
        const actionsByContext = {
            authentication: [],
            product_browsing: [],
            cart_operations: [],
            checkout_process: [],
            navigation: [],
            form_interactions: []
        };
        
        realUserActions.forEach(action => {
            const url = action.url || action.tabUrl || '';
            
            if (url.includes('/login') || url.includes('/register')) {
                actionsByContext.authentication.push(this.createLLMAction(action));
            } else if (url.includes('/product') || url.includes('/art/')) {
                actionsByContext.product_browsing.push(this.createLLMAction(action));
            } else if (url.includes('/cart') || action.element?.id?.includes('cart')) {
                actionsByContext.cart_operations.push(this.createLLMAction(action));
            } else if (url.includes('/order') || url.includes('/checkout')) {
                actionsByContext.checkout_process.push(this.createLLMAction(action));
            } else if (action.type === 'navigation') {
                actionsByContext.navigation.push(this.createLLMAction(action));
            } else if (action.type === 'input' || action.type === 'change') {
                actionsByContext.form_interactions.push(this.createLLMAction(action));
            }
        });
        
        // Извлекаем селекторы и элементы для воспроизведения
        const keySelectors = this.extractKeySelectorsForLLM(realUserActions);
        const formData = this.extractFormDataForLLM(sessionData.cdpData);
        
        return {
            meta: {
                sessionId: sessionData.meta.sessionId,
                timestamp: sessionData.meta.timestamp,
                duration: sessionData.meta.duration,
                totalEvents: allEvents.length,
                userActionsCount: realUserActions.length,
                startUrl: navigation[0]?.url || sessionData.meta.url,
                finalUrl: navigation[navigation.length - 1]?.url || sessionData.meta.url,
                format: 'llm_optimized_summary_v3.0'
            },
            
            // ОСНОВНЫЕ ДЕЙСТВИЯ ДЛЯ ВОСПРОИЗВЕДЕНИЯ
            userFlow: {
                authentication: actionsByContext.authentication,
                product_browsing: actionsByContext.product_browsing,
                cart_operations: actionsByContext.cart_operations,
                checkout_process: actionsByContext.checkout_process,
                navigation: actionsByContext.navigation,
                form_interactions: actionsByContext.form_interactions
            },
            
            // НАВИГАЦИОННАЯ ПОСЛЕДОВАТЕЛЬНОСТЬ
            navigationSequence: navigation.map((nav, index) => ({
                step: index + 1,
                url: nav.url,
                timestamp: nav.timestamp,
                relativeTime: nav.timestamp - (navigation[0]?.timestamp || 0)
            })),
            
            // СЕЛЕКТОРЫ И ЭЛЕМЕНТЫ ДЛЯ PLAYWRIGHT
            automationElements: keySelectors,
            
            // ДАННЫЕ ФОРМ ДЛЯ ЗАПОЛНЕНИЯ
            formInputs: formData,
            
            // INSIGHTS ДЛЯ LLM
            insights: {
                primaryUserIntent: this.detectUserIntent(actionsByContext),
                keyInteractionPoints: this.findKeyInteractionPoints(realUserActions),
                potentialIssues: this.detectPotentialIssues(realUserActions),
                automationComplexity: this.assessAutomationComplexity(realUserActions)
            }
        };
    }
    
    // Создаем компактное действие для LLM
    createLLMAction(action) {
        return {
            type: action.type,
            timestamp: action.timestamp,
            relativeTime: action.relativeTime || 0,
            element: {
                tagName: action.element?.tagName,
                id: action.element?.id,
                name: action.element?.name,
                className: action.element?.className,
                selector: action.element?.selector,
                xpath: action.element?.xpath,
                text: action.element?.text?.slice(0, 100), // Первые 100 символов
                value: action.element?.value
            },
            url: action.url || action.tabUrl,
            description: action.description || `${action.type} on ${action.element?.tagName}`,
            significance: action.significance || 0.5
        };
    }
    
    // Извлекаем ключевые селекторы для Playwright
    extractKeySelectorsForLLM(actions) {
        const selectorMap = new Map();
        
        actions.forEach(action => {
            if (action.element?.selector) {
                const key = action.element.selector;
                if (!selectorMap.has(key)) {
                    selectorMap.set(key, {
                        selector: key,
                        xpath: action.element.xpath,
                        tagName: action.element.tagName,
                        id: action.element.id,
                        className: action.element.className,
                        text: action.element.text,
                        usageCount: 0,
                        actions: []
                    });
                }
                
                const item = selectorMap.get(key);
                item.usageCount++;
                item.actions.push(action.type);
            }
        });
        
        return Array.from(selectorMap.values())
            .sort((a, b) => b.usageCount - a.usageCount)
            .slice(0, 20); // Топ 20 элементов
    }
    
    // Извлекаем данные форм для LLM
    extractFormDataForLLM(cdpData) {
        if (!cdpData || !cdpData.inputFields) return {};
        
        const formData = {};
        
        Object.entries(cdpData.inputFields).forEach(([key, field]) => {
            if (field.value && field.value.trim()) {
                formData[field.name || field.id || key] = {
                    type: field.type,
                    value: field.value,
                    selector: `[name="${field.name}"], #${field.id}`,
                    required: field.required || false
                };
            }
        });
        
        return formData;
    }
    
    // Определяем намерение пользователя
    detectUserIntent(actionsByContext) {
        const contexts = Object.keys(actionsByContext);
        const activeContexts = contexts.filter(ctx => actionsByContext[ctx].length > 0);
        
        if (activeContexts.includes('checkout_process')) return 'complete_purchase';
        if (activeContexts.includes('cart_operations')) return 'add_to_cart';
        if (activeContexts.includes('product_browsing')) return 'browse_products';
        if (activeContexts.includes('authentication')) return 'user_login';
        
        return 'general_browsing';
    }
    
    // Находим ключевые точки взаимодействия
    findKeyInteractionPoints(actions) {
        return actions
            .filter(action => action.significance > 0.7 || 
                           ['click', 'submit', 'change'].includes(action.type))
            .map(action => ({
                type: action.type,
                selector: action.element?.selector,
                description: action.description,
                timestamp: action.timestamp
            }))
            .slice(0, 10);
    }
    
    // Обнаруживаем потенциальные проблемы
    detectPotentialIssues(actions) {
        const issues = [];
        
        // Проверяем на повторяющиеся клики (возможные ошибки)
        const clickCounts = new Map();
        actions.filter(a => a.type === 'click').forEach(action => {
            const key = action.element?.selector;
            if (key) {
                clickCounts.set(key, (clickCounts.get(key) || 0) + 1);
            }
        });
        
        clickCounts.forEach((count, selector) => {
            if (count > 3) {
                issues.push({
                    type: 'repeated_clicks',
                    selector: selector,
                    count: count,
                    description: `Element clicked ${count} times - possible UI issue`
                });
            }
        });
        
        return issues;
    }
    
    // Оцениваем сложность автоматизации
    assessAutomationComplexity(actions) {
        let complexity = 'simple';
        
        const uniqueSelectors = new Set(actions.map(a => a.element?.selector).filter(Boolean)).size;
        const hasAjax = actions.some(a => a.type === 'ajax' || a.type === 'fetch');
        const hasModals = actions.some(a => a.type === 'modal_interaction');
        const hasNavigation = actions.some(a => a.type === 'navigation');
        
        if (uniqueSelectors > 10 || hasAjax || hasModals) complexity = 'medium';
        if (uniqueSelectors > 20 || (hasAjax && hasModals && hasNavigation)) complexity = 'complex';
        
        return complexity;
    }

    // Остальные методы из оригинального файла...
    generateClaudeCodeFormatSync(sessionData) {
        const actions = sessionData.actions || [];
        
        return {
            format: 'claude_code_automation',
            version: '2.0',
            session: {
                id: sessionData.meta.sessionId,
                url: sessionData.meta.url,
                duration: sessionData.meta.duration,
                timestamp: sessionData.meta.timestamp
            },
            
            userFlow: this.extractUserFlow(actions),
            keyInteractions: this.extractKeyInteractions(actions),
            pageElements: this.extractPageElements(actions),
            automationScript: this.generateAutomationScript(actions),
            
            insights: {
                totalActions: actions.length,
                significantActions: actions.filter(a => a.significance > 0.5).length,
                userIntentions: this.extractUserIntentions(actions),
                potentialAutomations: this.identifyAutomationOpportunities(actions)
            }
        };
    }

    extractUserFlow(actions) {
        return actions
            .filter(action => action.significance > 0.3)
            .map(action => ({
                type: action.type,
                element: action.element?.selector,
                timestamp: action.relativeTime
            }));
    }

    extractKeyInteractions(actions) {
        const keyTypes = ['click', 'input', 'submit', 'modal_opened', 'navigation'];
        
        return actions
            .filter(action => keyTypes.includes(action.type))
            .map(action => ({
                type: action.type,
                selector: action.element?.selector,
                value: action.value,
                timestamp: action.relativeTime
            }));
    }

    extractPageElements(actions) {
        const elementMap = new Map();
        
        actions.forEach(action => {
            if (action.element?.selector) {
                const key = action.element.selector;
                if (!elementMap.has(key)) {
                    elementMap.set(key, {
                        xpath: action.element.xpath,
                        selector: key,
                        tagName: action.element.tagName,
                        text: action.element.text,
                        interactions: 0
                    });
                }
                elementMap.get(key).interactions++;
            }
        });
        
        return Array.from(elementMap.values());
    }

    generateAutomationScript(actions) {
        // Простая генерация Playwright скрипта
        let script = '';
        actions.forEach(action => {
            if (action.element?.selector) {
                switch (action.type) {
                    case 'click':
                        script += `await page.click('${action.element.selector}');\n`;
                        break;
                    case 'input':
                        script += `await page.fill('${action.element.selector}', '${action.value || ''}');\n`;
                        break;
                }
            }
        });
        return script;
    }

    extractUserIntentions(actions) {
        // Анализ намерений пользователя
        return [];
    }

    identifyAutomationOpportunities(actions) {
        // Поиск возможностей для автоматизации
        return [];
    }

    async startCDPMonitoring(tab) {
        try {
            // ИСПРАВЛЕНИЕ: CDP ОТКЛЮЧЕН ДЛЯ МАКСИМАЛЬНОЙ СТАБИЛЬНОСТИ
            
            // Проверяем настройки CDP (по умолчанию ОТКЛЮЧЕН)
            const settings = await chrome.storage.local.get(['cdpEnabled']);
            if (!settings.cdpEnabled) {
                console.log('📊 CDP disabled in settings for performance');
                return;
            }
            
            // Только для PrestaShop страниц
            if (!tab.url || (!tab.url.includes('localhost:8082') && !tab.url.includes('localhost:8080'))) {
                console.log('📊 CDP skipped - not a PrestaShop page');
                return;
            }
            
            // Проверяем, не запущен ли уже для этой вкладки
            if (this.cdpMonitor && this.cdpMonitor.tabId === tab.id && this.cdpMonitor.isAttached) {
                console.log('📊 CDP already running for tab:', tab.id);
                return;
            }
            
            // Останавливаем предыдущий мониторинг
            if (this.cdpMonitor) {
                await this.cdpMonitor.stop();
                this.cdpMonitor = null;
            }
            
            // Создаем новый монитор с максимальной защитой от ошибок
            this.cdpMonitor = new EnhancedCDPMonitor(tab.id);
            await this.cdpMonitor.start();
            
            console.log('✅ Enhanced CDP monitoring started for tab:', tab.id);
        } catch (error) {
            console.warn('⚠️ CDP Monitor start failed (disabled for stability):', error.message);
            // Полностью очищаем состояние при ошибке
            if (this.cdpMonitor) {
                this.cdpMonitor.stop().catch(() => {});
                this.cdpMonitor = null;
            }
            // Отключаем CDP в настройках при ошибках
            chrome.storage.local.set({ cdpEnabled: false });
        }
    }

    async initializeEnhancedMonitoring() {
        try {
            console.log('🚀 Enhanced monitoring initializing WITHOUT automatic CDP...');
            
            // ИСПРАВЛЕНИЕ: НЕ запускаем CDP автоматически для стабильности
            // CDP будет запускаться только по запросу через DevTools или popup
            
            // Инициализируем только базовые компоненты
            console.log('✅ Enhanced monitoring ready (CDP on-demand only)');
            
            // Устанавливаем CDP как отключенный по умолчанию
            const settings = await chrome.storage.local.get(['cdpEnabled']);
            if (settings.cdpEnabled === undefined) {
                chrome.storage.local.set({ cdpEnabled: false });
                console.log('📊 CDP disabled by default for stability');
            }
        } catch (error) {
            console.warn('⚠️ Enhanced monitoring initialization warning:', error.message);
        }
    }
}

// Enhanced CDP Monitor Class (улучшенная версия с обработкой ошибок)
class EnhancedCDPMonitor {
    constructor(tabId) {
        this.tabId = tabId;
        this.debuggeeId = { tabId: tabId };
        this.inputFields = {};
        this.inputHistory = [];
        this.networkEvents = [];
        this.isAttached = false;
        this.scanInterval = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.attachTimeout = null;
    }

    async start() {
        try {
            console.log(`📊 Starting CDP Monitor for tab ${this.tabId}...`);
            
            // Проверяем, что вкладка существует
            const tab = await chrome.tabs.get(this.tabId).catch(() => null);
            if (!tab) {
                throw new Error(`Tab ${this.tabId} not found`);
            }
            
            await this.attach();
            await this.enableDomains();
            this.startMonitoring();
            this.isAttached = true;
            
            console.log(`✅ CDP Monitor attached to tab ${this.tabId}`);
        } catch (error) {
            console.error(`⚠️ CDP Monitor start failed for tab ${this.tabId}:`, error.message);
            await this.cleanup();
            throw error;
        }
    }

    async attach() {
        return new Promise((resolve, reject) => {
            // Устанавливаем timeout для attach операции
            this.attachTimeout = setTimeout(() => {
                reject(new Error('CDP attach timeout'));
            }, 5000);
            
            try {
                chrome.debugger.attach(this.debuggeeId, "1.3", () => {
                    clearTimeout(this.attachTimeout);
                    
                    if (chrome.runtime.lastError) {
                        console.warn(`CDP attach failed: ${chrome.runtime.lastError.message}`);
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        console.log(`🔗 CDP attached to tab ${this.tabId}`);
                        resolve();
                    }
                });
            } catch (error) {
                clearTimeout(this.attachTimeout);
                reject(error);
            }
        });
    }

    async enableDomains() {
        try {
            console.log(`🔧 Enabling CDP domains for tab ${this.tabId}...`);
            await this.sendCommand('Runtime.enable');
            await this.sendCommand('DOM.enable');
            // Network.enable может быть проблемным, делаем опциональным
            try {
                await this.sendCommand('Network.enable');
            } catch (networkError) {
                console.warn(`Network domain enable failed (non-critical): ${networkError.message}`);
            }
            console.log(`✅ CDP domains enabled for tab ${this.tabId}`);
        } catch (error) {
            console.error(`⚠️ Failed to enable CDP domains: ${error.message}`);
            throw error;
        }
    }

    startMonitoring() {
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
        }
        
        console.log(`🔍 Starting input field monitoring for tab ${this.tabId}...`);
        
        // Увеличиваем интервал до 2с для снижения нагрузки
        this.scanInterval = setInterval(() => {
            if (this.isAttached) {
                this.scanInputFields();
            }
        }, 2000);
    }

    async scanInputFields() {
        if (!this.isAttached) {
            console.warn(`CDP not attached, skipping scan for tab ${this.tabId}`);
            return;
        }

        try {
            const result = await this.sendCommand('Runtime.evaluate', {
                expression: `
                    (function() {
                        try {
                            const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
                            return JSON.stringify({
                                inputs: inputs.map((el, i) => ({
                                    tagName: el.tagName,
                                    type: el.type || 'text',
                                    name: el.name || '',
                                    id: el.id || '',
                                    value: el.value || '',
                                    placeholder: el.placeholder || '',
                                    className: el.className || '',
                                    visible: el.offsetWidth > 0 && el.offsetHeight > 0 && 
                                           window.getComputedStyle(el).display !== 'none'
                                })),
                                timestamp: Date.now(),
                                url: window.location.href
                            });
                        } catch (e) {
                            return JSON.stringify({ error: e.message, inputs: [] });
                        }
                    })()
                `,
                timeout: 3000 // 3с timeout
            });

            if (result && result.result && result.result.value) {
                try {
                    const data = JSON.parse(result.result.value);
                    if (data.error) {
                        console.warn(`Input scan error: ${data.error}`);
                    } else {
                        this.updateInputFields(data.inputs);
                    }
                } catch (parseError) {
                    console.warn(`Failed to parse input scan result: ${parseError.message}`);
                }
            }
        } catch (error) {
            console.warn(`CDP input scan failed for tab ${this.tabId}: ${error.message}`);
            
            // Если CDP отключился, помечаем как не подключенный
            if (error.message.includes('No target with given id found') || 
                error.message.includes('Target closed')) {
                console.log(`🔌 CDP connection lost for tab ${this.tabId}`);
                this.isAttached = false;
                await this.cleanup();
            }
        }
    }

    updateInputFields(inputs) {
        inputs.forEach((input, index) => {
            const key = `${input.name || input.id || input.type}_${index}`;
            
            if (!this.inputFields[key] || this.inputFields[key].value !== input.value) {
                // Записываем изменение
                if (this.inputFields[key] && input.value !== this.inputFields[key].value) {
                    this.inputHistory.push({
                        timestamp: Date.now(),
                        type: 'enhanced_input_change',
                        element: input,
                        oldValue: this.inputFields[key].value,
                        newValue: input.value
                    });
                }
                
                this.inputFields[key] = input;
            }
        });
    }

    async sendCommand(method, params = {}) {
        return new Promise((resolve, reject) => {
            if (!this.isAttached) {
                reject(new Error('CDP not attached'));
                return;
            }
            
            // Timeout для команд
            const commandTimeout = setTimeout(() => {
                reject(new Error(`CDP command ${method} timeout`));
            }, params.timeout || 5000);
            
            try {
                chrome.debugger.sendCommand(this.debuggeeId, method, params, (result) => {
                    clearTimeout(commandTimeout);
                    
                    if (chrome.runtime.lastError) {
                        const error = new Error(chrome.runtime.lastError.message);
                        console.warn(`CDP command ${method} failed: ${error.message}`);
                        reject(error);
                    } else {
                        resolve(result);
                    }
                });
            } catch (error) {
                clearTimeout(commandTimeout);
                reject(error);
            }
        });
    }

    getInputFields() {
        return this.inputFields;
    }

    getInputHistory() {
        return this.inputHistory;
    }

    getNetworkEvents() {
        return this.networkEvents;
    }

    async stop() {
        console.log(`🛑 Stopping CDP Monitor for tab ${this.tabId}...`);
        await this.cleanup();
    }
    
    async cleanup() {
        try {
            // Очищаем интервалы
            if (this.scanInterval) {
                clearInterval(this.scanInterval);
                this.scanInterval = null;
            }
            
            if (this.attachTimeout) {
                clearTimeout(this.attachTimeout);
                this.attachTimeout = null;
            }
            
            // Отключаем debugger если подключен
            if (this.isAttached) {
                try {
                    chrome.debugger.detach(this.debuggeeId);
                    console.log(`🔗 CDP detached from tab ${this.tabId}`);
                } catch (detachError) {
                    console.warn(`CDP detach warning: ${detachError.message}`);
                }
            }
            
            this.isAttached = false;
        } catch (error) {
            console.error(`CDP cleanup error: ${error.message}`);
        }
    }
}

// Запуск
new EnhancedDebugProBackground();