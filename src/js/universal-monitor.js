// Universal Browser Event Monitor - Полный детектор изменений для LLM
// Поддержка BiDi, расширенный CDP, MutationObserver + Event Delegation

class UniversalBrowserMonitor {
    constructor() {
        this.events = [];
        this.domSnapshot = new Map();
        this.activeConnections = {
            cdp: null,
            bidi: null,
            websocket: null
        };
        
        this.eventCategories = {
            USER_INTERACTIONS: ['click', 'input', 'change', 'focus', 'blur', 'submit'],
            DOM_CHANGES: ['childList', 'attributes', 'characterData'],
            NAVIGATION: ['pushstate', 'popstate', 'hashchange', 'beforeunload'],
            DYNAMIC_CONTENT: ['load', 'DOMContentLoaded', 'resize', 'scroll'],
            ASYNC_EVENTS: ['xhr', 'fetch', 'promise', 'timeout', 'interval']
        };
        
        this.init();
    }

    async init() {
        await this.setupBiDiConnection();
        await this.setupWebSocketCDP();
        this.setupUniversalEventListeners();
        this.setupDOMObserver();
        this.setupAsyncMonitoring();
        this.startSnapshotting();
    }

    // === WebDriver BiDi Implementation ===
    async setupBiDiConnection() {
        try {
            // BiDi через WebSocket (если поддерживается)
            const bidiUrl = 'ws://localhost:9222/session';
            this.activeConnections.bidi = new WebSocket(bidiUrl);
            
            this.activeConnections.bidi.onmessage = (event) => {
                const message = JSON.parse(event.data);
                this.processBiDiEvent(message);
            };

            // Подписываемся на все события BiDi
            this.sendBiDiCommand('session.subscribe', {
                events: [
                    'browsingContext.load',
                    'browsingContext.domContentLoaded',
                    'browsingContext.navigationStarted',
                    'script.realmCreated',
                    'log.entryAdded',
                    'browsingContext.userPromptOpened'
                ]
            });

        } catch (error) {
            console.log('BiDi not available, fallback to CDP');
        }
    }

    // === Enhanced WebSocket CDP ===
    async setupWebSocketCDP() {
        try {
            const response = await fetch('http://localhost:9222/json/list');
            const tabs = await response.json();
            const currentTab = tabs.find(tab => tab.url === window.location.href);
            
            if (currentTab?.webSocketDebuggerUrl) {
                this.activeConnections.websocket = new WebSocket(currentTab.webSocketDebuggerUrl);
                
                this.activeConnections.websocket.onmessage = (event) => {
                    const message = JSON.parse(event.data);
                    this.processCDPEvent(message);
                };

                // Подписываемся на все CDP события
                this.sendCDPCommand('Runtime.enable');
                this.sendCDPCommand('DOM.enable');
                this.sendCDPCommand('Network.enable');
                this.sendCDPCommand('Page.enable');
                this.sendCDPCommand('Log.enable');
            }
        } catch (error) {
            console.log('WebSocket CDP not available');
        }
    }

    // === Universal Event Listeners ===
    setupUniversalEventListeners() {
        // Перехватываем ВСЕ события через event delegation
        document.addEventListener('click', (e) => this.captureEvent('click', e), true);
        document.addEventListener('input', (e) => this.captureEvent('input', e), true);
        document.addEventListener('change', (e) => this.captureEvent('change', e), true);
        document.addEventListener('focus', (e) => this.captureEvent('focus', e), true);
        document.addEventListener('blur', (e) => this.captureEvent('blur', e), true);
        document.addEventListener('submit', (e) => this.captureEvent('submit', e), true);
        
        // Специальные события для интерактивных элементов
        document.addEventListener('mousedown', (e) => this.captureEvent('mousedown', e), true);
        document.addEventListener('mouseup', (e) => this.captureEvent('mouseup', e), true);
        document.addEventListener('keydown', (e) => this.captureEvent('keydown', e), true);
        document.addEventListener('keyup', (e) => this.captureEvent('keyup', e), true);

        // События для модальных окон и popups
        this.monitorModalEvents();
        this.monitorDatepickerEvents();
        this.monitorSliderEvents();
        this.monitorFilterEvents();
    }

    // === Specialized Interactive Element Monitoring ===
    monitorModalEvents() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        // Детекция модальных окон
                        if (this.isModal(node)) {
                            this.recordEvent({
                                type: 'modal_opened',
                                element: this.getElementInfo(node),
                                timestamp: Date.now()
                            });
                        }
                        
                        // Детекция datepicker
                        if (this.isDatepicker(node)) {
                            this.recordEvent({
                                type: 'datepicker_opened',
                                element: this.getElementInfo(node),
                                timestamp: Date.now()
                            });
                        }
                    }
                });
            });
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    }

    monitorSliderEvents() {
        document.addEventListener('input', (e) => {
            if (e.target.type === 'range') {
                this.recordEvent({
                    type: 'slider_change',
                    element: this.getElementInfo(e.target),
                    value: e.target.value,
                    min: e.target.min,
                    max: e.target.max,
                    timestamp: Date.now()
                });
            }
        });
    }

    monitorFilterEvents() {
        // Мониторинг фильтров (select, checkbox, radio)
        document.addEventListener('change', (e) => {
            if (['SELECT', 'INPUT'].includes(e.target.tagName)) {
                const filterType = this.detectFilterType(e.target);
                if (filterType) {
                    this.recordEvent({
                        type: 'filter_applied',
                        filterType: filterType,
                        element: this.getElementInfo(e.target),
                        value: e.target.value || e.target.checked,
                        timestamp: Date.now()
                    });
                }
            }
        });
    }

    // === Advanced DOM Monitoring ===
    setupDOMObserver() {
        this.domObserver = new MutationObserver((mutations) => {
            const changes = this.analyzeDOMChanges(mutations);
            
            if (changes.significantChanges > 0) {
                this.recordEvent({
                    type: 'dom_mutation',
                    changes: changes,
                    timestamp: Date.now()
                });
            }
        });

        this.domObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeOldValue: true,
            characterData: true,
            characterDataOldValue: true
        });
    }

    analyzeDOMChanges(mutations) {
        const analysis = {
            elementsAdded: 0,
            elementsRemoved: 0,
            attributesChanged: 0,
            textChanges: 0,
            significantChanges: 0,
            details: []
        };

        mutations.forEach(mutation => {
            switch (mutation.type) {
                case 'childList':
                    analysis.elementsAdded += mutation.addedNodes.length;
                    analysis.elementsRemoved += mutation.removedNodes.length;
                    
                    // Записываем детали для значимых изменений
                    if (mutation.addedNodes.length > 0) {
                        mutation.addedNodes.forEach(node => {
                            if (node.nodeType === 1 && this.isSignificantElement(node)) {
                                analysis.details.push({
                                    action: 'added',
                                    element: this.getElementInfo(node)
                                });
                                analysis.significantChanges++;
                            }
                        });
                    }
                    break;
                    
                case 'attributes':
                    analysis.attributesChanged++;
                    if (this.isSignificantAttribute(mutation.attributeName)) {
                        analysis.details.push({
                            action: 'attribute_changed',
                            element: this.getElementInfo(mutation.target),
                            attribute: mutation.attributeName,
                            oldValue: mutation.oldValue,
                            newValue: mutation.target.getAttribute(mutation.attributeName)
                        });
                        analysis.significantChanges++;
                    }
                    break;
                    
                case 'characterData':
                    analysis.textChanges++;
                    if (mutation.oldValue !== mutation.target.textContent) {
                        analysis.details.push({
                            action: 'text_changed',
                            oldText: mutation.oldValue,
                            newText: mutation.target.textContent
                        });
                        analysis.significantChanges++;
                    }
                    break;
            }
        });

        return analysis;
    }

    // === Async Operations Monitoring ===
    setupAsyncMonitoring() {
        // XMLHttpRequest перехват
        const originalXHR = window.XMLHttpRequest.prototype.open;
        window.XMLHttpRequest.prototype.open = function(...args) {
            this.addEventListener('loadend', () => {
                self.recordEvent({
                    type: 'xhr_completed',
                    method: args[0],
                    url: args[1],
                    status: this.status,
                    timestamp: Date.now()
                });
            });
            return originalXHR.apply(this, args);
        };

        // Fetch перехват
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            const startTime = Date.now();
            return originalFetch.apply(this, args).then(response => {
                self.recordEvent({
                    type: 'fetch_completed',
                    url: args[0],
                    status: response.status,
                    duration: Date.now() - startTime,
                    timestamp: Date.now()
                });
                return response;
            });
        };

        // Promise мониторинг
        this.monitorPromises();
    }

    // === Event Processing ===
    captureEvent(type, event) {
        const elementInfo = this.getElementInfo(event.target);
        const eventData = {
            type: type,
            element: elementInfo,
            timestamp: Date.now(),
            coordinates: this.getEventCoordinates(event),
            value: this.getElementValue(event.target),
            context: this.getEventContext(event)
        };

        this.recordEvent(eventData);
    }

    getElementInfo(element) {
        if (!element) return null;
        
        return {
            tagName: element.tagName,
            id: element.id || '',
            className: element.className || '',
            name: element.name || '',
            type: element.type || '',
            value: element.value || '',
            text: element.textContent?.slice(0, 100) || '',
            xpath: this.generateXPath(element),
            selector: this.generateSelector(element),
            attributes: this.getRelevantAttributes(element)
        };
    }

    // === LLM-Optimized Output ===
    generateLLMFormat() {
        return {
            session: {
                id: this.sessionId,
                timestamp: new Date().toISOString(),
                url: window.location.href,
                duration: Date.now() - this.startTime
            },
            
            events: this.events.map(event => ({
                timestamp: event.timestamp,
                type: event.type,
                description: this.generateEventDescription(event),
                element: event.element,
                context: event.context,
                significance: this.calculateEventSignificance(event)
            })),
            
            summary: {
                totalEvents: this.events.length,
                userInteractions: this.events.filter(e => this.eventCategories.USER_INTERACTIONS.includes(e.type)).length,
                domChanges: this.events.filter(e => e.type === 'dom_mutation').length,
                asyncOperations: this.events.filter(e => ['xhr_completed', 'fetch_completed'].includes(e.type)).length
            },
            
            insights: this.generateInsights()
        };
    }

    generateEventDescription(event) {
        const descriptions = {
            'click': `Clicked on ${event.element?.tagName} element`,
            'input': `Entered text: "${event.value}" in ${event.element?.name || 'input field'}`,
            'modal_opened': `Modal dialog appeared`,
            'filter_applied': `Applied filter: ${event.filterType}`,
            'dom_mutation': `Page content changed: ${event.changes?.significantChanges} significant changes`
        };
        
        return descriptions[event.type] || `${event.type} event occurred`;
    }

    // === Utility Methods ===
    isModal(element) {
        return element.matches('.modal, .popup, [role="dialog"], .overlay, .lightbox') ||
               element.style.position === 'fixed' && element.style.zIndex > 1000;
    }

    isDatepicker(element) {
        return element.matches('.datepicker, .date-picker, .calendar, [class*="date"]') ||
               element.querySelector('input[type="date"]');
    }

    detectFilterType(element) {
        if (element.type === 'checkbox') return 'checkbox_filter';
        if (element.type === 'radio') return 'radio_filter';
        if (element.tagName === 'SELECT') return 'dropdown_filter';
        if (element.matches('[data-filter], .filter, .search')) return 'custom_filter';
        return null;
    }

    recordEvent(eventData) {
        this.events.push(eventData);
        
        // Отправляем в content script для сохранения
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.sendMessage({
                action: 'universal_event',
                data: eventData
            });
        }
    }
}

// Инициализация
const universalMonitor = new UniversalBrowserMonitor();

// Экспорт для использования в расширении
if (typeof window !== 'undefined') {
    window.universalMonitor = universalMonitor;
}
