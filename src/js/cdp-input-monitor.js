// CDP Input Monitor - Мониторинг полей ввода через Chrome DevTools Protocol
// Интеграция с PrestaShop Debug Pro для чтения текста без скриншотов

class CDPInputMonitor {
    constructor() {
        this.debuggeeId = null;
        this.inputEvents = [];
        this.fieldsMap = new Map(); // Кэш полей ввода
        this.isAttached = false;
        this.monitoringActive = false;
        
        this.init();
    }

    async init() {
        await this.attachToCurrentTab();
        await this.enableDomainEvents();
        this.setupEventHandlers();
        this.startMonitoring();
    }

    async attachToCurrentTab() {
        try {
            // Получаем активную вкладку
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab || !tab.url.includes('localhost:8082')) {
                console.log('CDP Monitor: Not on target URL');
                return;
            }

            this.debuggeeId = { tabId: tab.id };
            
            // Прикрепляемся к вкладке через debugger API
            await new Promise((resolve, reject) => {
                chrome.debugger.attach(this.debuggeeId, "1.3", () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        this.isAttached = true;
                        console.log('CDP Monitor: Attached to tab', tab.id);
                        resolve();
                    }
                });
            });

        } catch (error) {
            console.error('CDP Monitor: Failed to attach:', error);
        }
    }

    async enableDomainEvents() {
        if (!this.isAttached) return;

        try {
            // Включаем необходимые домены CDP
            await this.sendCommand('Runtime.enable');
            await this.sendCommand('DOM.enable');
            await this.sendCommand('Page.enable');
            
            console.log('CDP Monitor: Enabled CDP domains');
        } catch (error) {
            console.error('CDP Monitor: Failed to enable domains:', error);
        }
    }

    setupEventHandlers() {
        if (!this.isAttached) return;

        // Слушаем события CDP
        chrome.debugger.onEvent.addListener((source, method, params) => {
            if (source.tabId !== this.debuggeeId.tabId) return;

            switch (method) {
                case 'DOM.attributeModified':
                    this.handleAttributeModified(params);
                    break;
                    
                case 'Runtime.consoleAPICalled':
                    this.handleConsoleEvent(params);
                    break;
            }
        });

        console.log('CDP Monitor: Event handlers setup');
    }

    async startMonitoring() {
        if (!this.isAttached || this.monitoringActive) return;

        try {
            this.monitoringActive = true;
            
            // Запускаем периодическое сканирование полей ввода
            setInterval(() => {
                this.scanInputFields();
            }, 500); // Каждые 500ms
            
            console.log('CDP Monitor: Started input monitoring');
        } catch (error) {
            console.error('CDP Monitor: Failed to start monitoring:', error);
        }
    }

    async scanInputFields() {
        if (!this.isAttached) return;

        try {
            // Получаем все поля ввода на странице
            const result = await this.sendCommand('Runtime.evaluate', {
                expression: `
                    (() => {
                        const inputs = [];
                        const selectors = ['input[type="text"]', 'input[type="email"]', 'input[type="password"]', 'textarea'];
                        
                        selectors.forEach(selector => {
                            document.querySelectorAll(selector).forEach((element, index) => {
                                const rect = element.getBoundingClientRect();
                                const xpath = this.generateXPath(element);
                                
                                inputs.push({
                                    selector: selector,
                                    xpath: xpath,
                                    tagName: element.tagName,
                                    type: element.type || 'text',
                                    name: element.name || '',
                                    id: element.id || '',
                                    placeholder: element.placeholder || '',
                                    value: element.value || '',
                                    focused: document.activeElement === element,
                                    visible: rect.width > 0 && rect.height > 0,
                                    coordinates: {
                                        x: Math.round(rect.left + rect.width / 2),
                                        y: Math.round(rect.top + rect.height / 2)
                                    }
                                });
                            });
                        });
                        
                        return inputs;
                        
                        function generateXPath(element) {
                            if (element.id) return \`//\${element.tagName.toLowerCase()}[@id="\${element.id}"]\`;
                            if (element.name) return \`//\${element.tagName.toLowerCase()}[@name="\${element.name}"]\`;
                            
                            let path = '';
                            while (element && element.nodeType === Node.ELEMENT_NODE) {
                                let index = 0;
                                let sibling = element.previousSibling;
                                while (sibling) {
                                    if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === element.tagName) {
                                        index++;
                                    }
                                    sibling = sibling.previousSibling;
                                }
                                
                                const tagName = element.tagName.toLowerCase();
                                const indexStr = index > 0 ? \`[\${index + 1}]\` : '';
                                path = \`/\${tagName}\${indexStr}\${path}\`;
                                element = element.parentElement;
                            }
                            
                            return path;
                        }
                    })()
                `,
                returnByValue: true
            });

            if (result && result.result && result.result.value) {
                const inputFields = result.result.value;
                this.processInputFields(inputFields);
            }

        } catch (error) {
            console.error('CDP Monitor: Failed to scan input fields:', error);
        }
    }

    processInputFields(inputFields) {
        const timestamp = Date.now();
        
        inputFields.forEach(field => {
            const fieldKey = field.xpath || `${field.tagName}_${field.name}_${field.id}`;
            const previousField = this.fieldsMap.get(fieldKey);
            
            // Проверяем изменения значения
            if (!previousField || previousField.value !== field.value) {
                const inputEvent = {
                    timestamp: timestamp,
                    type: 'input_change',
                    element: {
                        xpath: field.xpath,
                        selector: field.selector,
                        tagName: field.tagName,
                        testId: field.name || field.id,
                        text: field.value,
                        attributes: {
                            name: field.name,
                            type: field.type,
                            id: field.id,
                            placeholder: field.placeholder,
                            value: field.value
                        }
                    },
                    value: field.value,
                    previousValue: previousField?.value || '',
                    focused: field.focused,
                    coordinates: field.coordinates,
                    url: window.location.href
                };

                // Отправляем событие в content script
                this.sendToContentScript(inputEvent);
                
                console.log('CDP Monitor: Input change detected:', {
                    field: field.name || field.id,
                    value: field.value,
                    focused: field.focused
                });
            }
            
            // Обновляем кэш
            this.fieldsMap.set(fieldKey, field);
        });
    }

    async sendToContentScript(inputEvent) {
        try {
            // Отправляем событие в content script через messaging
            await chrome.tabs.sendMessage(this.debuggeeId.tabId, {
                action: 'cdp_input_event',
                data: inputEvent
            });
        } catch (error) {
            console.error('CDP Monitor: Failed to send to content script:', error);
        }
    }

    async sendCommand(method, params = {}) {
        if (!this.isAttached) throw new Error('Not attached to debuggee');

        return new Promise((resolve, reject) => {
            chrome.debugger.sendCommand(this.debuggeeId, method, params, (result) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(result);
                }
            });
        });
    }

    handleAttributeModified(params) {
        // Обрабатываем изменения атрибутов (например, value)
        if (params.name === 'value') {
            console.log('CDP Monitor: Value attribute modified:', params);
        }
    }

    handleConsoleEvent(params) {
        // Можем отслеживать console события если нужно
        if (params.type === 'log' && params.args?.[0]?.value?.includes('input')) {
            console.log('CDP Monitor: Input-related console event:', params);
        }
    }

    async detach() {
        if (this.isAttached) {
            try {
                chrome.debugger.detach(this.debuggeeId);
                this.isAttached = false;
                this.monitoringActive = false;
                console.log('CDP Monitor: Detached from tab');
            } catch (error) {
                console.error('CDP Monitor: Failed to detach:', error);
            }
        }
    }

    // Публичные методы для получения данных
    getCurrentFieldValues() {
        const values = {};
        this.fieldsMap.forEach((field, key) => {
            if (field.value) {
                values[key] = {
                    name: field.name,
                    type: field.type,
                    value: field.value,
                    focused: field.focused
                };
            }
        });
        return values;
    }

    getInputHistory() {
        return this.inputEvents.slice(); // Возвращаем копию
    }
}

// Экспорт для Service Worker (importScripts)
self.CDPInputMonitor = CDPInputMonitor;
