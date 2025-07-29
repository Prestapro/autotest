// Enhanced PrestaShop Debug Pro - Content Script ИСПРАВЛЕННАЯ ВЕРСИЯ
// Полная запись пользовательских действий + навигация

(function() {
    'use strict';
    
    // Защита от повторной инициализации
    if (window.prestashopDebugProFixed) {
        console.log('Fixed recorder already initialized');
        return;
    }
    window.prestashopDebugProFixed = true;

    class FixedPrestaShopRecorder {
        constructor() {
            this.recording = false;
            this.sessionId = this.generateSessionId();
            this.actions = [];
            this.errors = [];
            this.startTime = Date.now();
            this.currentUrl = window.location.href;
            
            this.init();
        }

        generateSessionId() {
            return `session-${new Date().toISOString().slice(0,19).replace(/:/g,'')}-${Math.random().toString(36).substr(2,9)}`;
        }

        async init() {
            console.log('🚀 Initializing Fixed PrestaShop Recorder');
            
            // Настраиваем обработчики сообщений
            this.setupMessageHandlers();
            
            // ИСПРАВЛЕНИЕ: Виджет создается автоматически при инициализации
            setTimeout(() => {
                console.log('🎯 Attempting to create widget...');
                this.createEnhancedWidget();
            }, 2000); // Задержка 2с для полной загрузки DOM
            
            // Запускаем полный мониторинг ВСЕХ событий 
            this.startComprehensiveMonitoring();
            
            // Добавляем обработчик ошибок
            this.setupErrorHandling();
            
            // Запускаем автоматическую запись
            this.startRecording();
            
            console.log('✅ Fixed recorder initialized successfully');
        }

        setupMessageHandlers() {
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                switch (message.action) {
                    case 'show_widget':
                        this.createEnhancedWidget();
                        sendResponse({ success: true });
                        break;
                        
                    case 'hide_widget':
                        this.hideWidget();
                        sendResponse({ success: true });
                        break;
                        
                    case 'toggle_widget':
                        this.toggleWidget();
                        sendResponse({ success: true });
                        break;
                        
                    case 'start_enhanced_recording':
                        this.startRecording();
                        sendResponse({ success: true });
                        break;
                        
                    case 'stop_enhanced_recording':
                        this.stopRecording();
                        sendResponse({ success: true });
                        break;
                        
                    case 'page_navigation':
                        this.handlePageNavigation(message);
                        break;
                        
                    default:
                        console.log('Unknown message:', message.action);
                }
            });
        }

        // ИСПРАВЛЕНИЕ: Записываем ВСЕ пользовательские действия
        startComprehensiveMonitoring() {
            // 1. КЛИКИ - самое важное
            document.addEventListener('click', (event) => {
                this.recordUserAction('click', event.target, event);
            }, true);

            // 2. ВВОД ТЕКСТА
            document.addEventListener('input', (event) => {
                this.recordUserAction('input', event.target, event);
            }, true);

            // 3. ИЗМЕНЕНИЯ В ФОРМАХ
            document.addEventListener('change', (event) => {
                this.recordUserAction('change', event.target, event);
            }, true);

            // 4. ОТПРАВКА ФОРМ
            document.addEventListener('submit', (event) => {
                this.recordUserAction('submit', event.target, event);
            }, true);

            // 5. ФОКУС НА ЭЛЕМЕНТАХ
            document.addEventListener('focus', (event) => {
                this.recordUserAction('focus', event.target, event);
            }, true);

            // 6. ПОТЕРЯ ФОКУСА
            document.addEventListener('blur', (event) => {
                this.recordUserAction('blur', event.target, event);
            }, true);

            // 7. НАЖАТИЯ КЛАВИШ (для количества, стрелки, Enter)
            document.addEventListener('keydown', (event) => {
                // Записываем важные клавиши
                if (['Enter', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown'].includes(event.key) ||
                    event.key.match(/^[0-9]$/) || event.ctrlKey || event.metaKey) {
                    this.recordUserAction('keydown', event.target, event);
                }
            }, true);

            // 8. ВЫБОР В SELECT
            document.addEventListener('select', (event) => {
                this.recordUserAction('select', event.target, event);
            }, true);

            // 9. DRAG & DROP
            document.addEventListener('dragstart', (event) => {
                this.recordUserAction('dragstart', event.target, event);
            }, true);

            document.addEventListener('drop', (event) => {
                this.recordUserAction('drop', event.target, event);
            }, true);

            // 10. СКРОЛЛИНГ (throttled)
            let scrollTimeout;
            document.addEventListener('scroll', (event) => {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    this.recordUserAction('scroll', event.target || document.documentElement, event);
                }, 500);
            }, true);

            // 11. AJAX ПЕРЕХВАТ
            this.interceptAjax();

            // 12. МОДАЛЬНЫЕ ОКНА
            this.monitorModals();

            // 13. DOM МУТАЦИИ
            this.monitorDOMChanges();

            console.log('✅ Comprehensive monitoring started');
        }

        // ОСНОВНОЙ метод записи действий
        recordUserAction(type, element, event) {
            if (!this.recording) return;

            const actionData = {
                type: type,
                timestamp: Date.now(),
                relativeTime: Date.now() - this.startTime,
                element: this.extractElementData(element),
                event: this.extractEventData(event),
                url: window.location.href,
                significance: this.calculateSignificance(type, element),
                description: this.generateDescription(type, element, event)
            };

            // Добавляем дополнительные данные для конкретных типов
            switch(type) {
                case 'input':
                case 'change':
                    actionData.value = element.value;
                    actionData.oldValue = element.defaultValue;
                    break;
                    
                case 'click':
                    actionData.clickPosition = { x: event.clientX, y: event.clientY };
                    actionData.button = event.button;
                    break;
                    
                case 'keydown':
                    actionData.key = event.key;
                    actionData.keyCode = event.keyCode;
                    actionData.modifiers = {
                        ctrl: event.ctrlKey,
                        shift: event.shiftKey,
                        alt: event.altKey,
                        meta: event.metaKey
                    };
                    break;
            }

            this.actions.push(actionData);

            // Обновляем UI виджета после записи действия
            this.updateWidgetUI();

            // Отправляем в background script (с проверкой context)
            if (chrome.runtime?.id) {
                try {
                    chrome.runtime.sendMessage({
                        action: 'user_action_recorded',
                        data: actionData
                    });
                } catch (error) {
                    console.warn('Background communication failed:', error.message);
                }
            }

            console.log(`📝 Recorded ${type}:`, actionData.element.selector, actionData.value || '');
        }

        // Извлекаем полные данные элемента
        extractElementData(element) {
            if (!element) return null;

            return {
                tagName: element.tagName,
                id: element.id,
                name: element.name,
                className: element.className,
                type: element.type,
                value: element.value,
                text: this.getElementText(element),
                placeholder: element.placeholder,
                selector: this.generateSelector(element),
                xpath: this.generateXPath(element),
                attributes: this.getElementAttributes(element),
                boundingRect: element && typeof element.getBoundingClientRect === 'function' 
                    ? element.getBoundingClientRect() 
                    : { x: 0, y: 0, width: 0, height: 0 },
                visible: this.isElementVisible(element),
                dataset: element.dataset ? Object.assign({}, element.dataset) : {}
            };
        }

        // Извлекаем данные события
        extractEventData(event) {
            if (!event) {
                return {
                    type: 'synthetic',
                    bubbles: false,
                    cancelable: false,
                    timeStamp: Date.now(),
                    isTrusted: false
                };
            }
            
            return {
                type: event.type || 'unknown',
                bubbles: event.bubbles || false,
                cancelable: event.cancelable || false,
                timeStamp: event.timeStamp || Date.now(),
                isTrusted: event.isTrusted || false
            };
        }

        // Получаем текст элемента (первые 200 символов)
        getElementText(element) {
            if (!element) return '';
            
            let text = '';
            if (element.innerText) {
                text = element.innerText.trim();
            } else if (element.textContent) {
                text = element.textContent.trim();
            } else if (element.value) {
                text = element.value;
            } else if (element.alt) {
                text = element.alt;
            } else if (element.title) {
                text = element.title;
            }
            
            return text.slice(0, 200);
        }

        // Генерируем CSS селектор
        generateSelector(element) {
            if (!element) return '';
            
            // Приоритет: ID > data-testid > class > tagName
            if (element.id) {
                return `#${element.id}`;
            }
            
            if (element.dataset && element.dataset.testid) {
                return `[data-testid="${element.dataset.testid}"]`;
            }
            
            if (element.name) {
                return `[name="${element.name}"]`;
            }
            
            if (element.className && element.tagName) {
                const classes = element.className.split(' ').filter(c => c.trim());
                if (classes.length > 0) {
                    return `${element.tagName.toLowerCase()}.${classes[0]}`;
                }
            }
            
            return element.tagName ? element.tagName.toLowerCase() : 'unknown';
        }

        // Генерируем XPath
        generateXPath(element) {
            if (!element) return '';
            
            if (element.id) {
                return `//*[@id="${element.id}"]`;
            }
            
            let path = '';
            let currentElement = element;
            
            while (currentElement && currentElement.nodeType === Node.ELEMENT_NODE) {
                let selector = currentElement.nodeName.toLowerCase();
                
                if (currentElement.id) {
                    path = `//*[@id="${currentElement.id}"]` + path;
                    break;
                }
                
                // Считаем позицию среди соседей
                let index = 1;
                let sibling = currentElement.previousElementSibling;
                while (sibling) {
                    if (sibling.nodeName.toLowerCase() === selector) {
                        index++;
                    }
                    sibling = sibling.previousElementSibling;
                }
                
                if (index > 1) {
                    selector += `[${index}]`;
                }
                
                path = '/' + selector + path;
                currentElement = currentElement.parentNode;
            }
            
            return path;
        }

        // Получаем атрибуты элемента
        getElementAttributes(element) {
            const attrs = {};
            if (element.attributes) {
                for (let attr of element.attributes) {
                    attrs[attr.name] = attr.value;
                }
            }
            return attrs;
        }

        // Проверяем видимость элемента
        isElementVisible(element) {
            if (!element || typeof element.getBoundingClientRect !== 'function') {
                return false;
            }
            
            try {
                const rect = element.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0 && 
                       window.getComputedStyle(element).display !== 'none';
            } catch (error) {
                console.warn('isElementVisible failed:', error.message);
                return false;
            }
        }

        // Рассчитываем значимость действия
        calculateSignificance(type, element) {
            let significance = 0.5;
            
            // Высокая значимость
            if (type === 'submit') significance = 0.9;
            if (type === 'click' && element.type === 'submit') significance = 0.9;
            if (type === 'click' && element.tagName === 'BUTTON') significance = 0.8;
            if (element.id && element.id.includes('cart')) significance = 0.8;
            if (element.className && element.className.includes('btn-primary')) significance = 0.8;
            
            // Средняя значимость
            if (type === 'change' && element.tagName === 'SELECT') significance = 0.7;
            if (type === 'input' && element.type === 'number') significance = 0.7;
            if (type === 'click' && element.tagName === 'A') significance = 0.6;
            
            // Низкая значимость
            if (type === 'focus' || type === 'blur') significance = 0.3;
            if (type === 'scroll') significance = 0.2;
            
            return significance;
        }

        // Генерируем описание действия
        generateDescription(type, element, event) {
            const elementDesc = element.id || element.name || element.className || element.tagName;
            
            switch(type) {
                case 'click':
                    return `Clicked on ${elementDesc}`;
                case 'input':
                    return `Entered text in ${elementDesc}`;
                case 'change':
                    return `Changed value in ${elementDesc}`;
                case 'submit':
                    return `Submitted form ${elementDesc}`;
                case 'focus':
                    return `Focused on ${elementDesc}`;
                case 'keydown':
                    return `Pressed ${event.key} in ${elementDesc}`;
                default:
                    return `${type} on ${elementDesc}`;
            }
        }

        // Перехватываем AJAX запросы
        interceptAjax() {
            // XMLHttpRequest
            const originalXHR = window.XMLHttpRequest.prototype.open;
            const self = this;
            
            window.XMLHttpRequest.prototype.open = function(method, url, ...args) {
                this.addEventListener('load', function() {
                    self.recordUserAction('xhr_completed', {
                        target: { 
                            tagName: 'XHR',
                            xhr: { method, url, status: this.status, response: this.responseText }
                        }
                    });
                });
                
                return originalXHR.apply(this, [method, url, ...args]);
            };

            // Fetch API
            const originalFetch = window.fetch;
            window.fetch = function(...args) {
                return originalFetch.apply(this, args).then(response => {
                    self.recordUserAction('fetch_completed', {
                        target: {
                            tagName: 'FETCH',
                            fetch: { url: args[0], status: response.status }
                        }
                    });
                    return response;
                });
            };
        }

        // Мониторим модальные окна
        monitorModals() {
            try {
                const observer = new MutationObserver((mutations) => {
                    try {
                        mutations.forEach((mutation) => {
                            if (mutation.addedNodes) {
                                mutation.addedNodes.forEach((node) => {
                                    try {
                                        if (node.nodeType === Node.ELEMENT_NODE && node.classList) {
                                            // Проверяем на модальные окна
                                            if (node.classList.contains('modal') || 
                                                node.classList.contains('popup') ||
                                                node.id === 'blockcart-modal') {
                                                
                                                this.recordUserAction('modal_opened', node, null);
                                            }
                                        }
                                    } catch (nodeError) {
                                        // Игнорируем ошибки отдельных узлов
                                    }
                                });
                            }
                        });
                    } catch (mutationError) {
                        console.warn('Modal observer mutation error:', mutationError.message);
                    }
                });

                if (document.body) {
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true
                    });
                } else {
                    console.warn('Document body not ready for modal monitoring');
                }
            } catch (error) {
                console.error('Modal monitoring setup failed:', error);
            }
        }

        // Мониторим изменения DOM
        monitorDOMChanges() {
            try {
                const observer = new MutationObserver((mutations) => {
                    try {
                        mutations.forEach((mutation) => {
                            try {
                                if (mutation.type === 'childList' && mutation.addedNodes && mutation.addedNodes.length > 0) {
                                    // Фильтруем только значительные изменения
                                    const significantNodes = Array.from(mutation.addedNodes).filter(node => 
                                        node.nodeType === Node.ELEMENT_NODE && 
                                        node.tagName && 
                                        !['SCRIPT', 'STYLE', 'META', 'LINK'].includes(node.tagName)
                                    );
                                    
                                    if (significantNodes.length > 0) {
                                        this.recordUserAction('dom_mutation', mutation.target, {
                                            type: 'mutation',
                                            mutationType: 'childList', 
                                            addedNodes: significantNodes.length
                                        });
                                    }
                                }
                            } catch (mutationError) {
                                // Игнорируем ошибки отдельных мутаций
                            }
                        });
                    } catch (batchError) {
                        console.warn('DOM mutation batch error:', batchError.message);
                    }
                });

                if (document.body) {
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true,
                        attributes: false,
                        characterData: false
                    });
                } else {
                    console.warn('Document body not ready for DOM monitoring');
                }
            } catch (error) {
                console.error('DOM monitoring setup failed:', error);
            }
        }

        // Обработка навигации
        handlePageNavigation(message) {
            this.currentUrl = message.url;
            
            this.recordUserAction('navigation', {
                target: {
                    tagName: 'NAVIGATION',
                    url: message.url,
                    previousUrl: message.previousUrl,
                    timestamp: message.timestamp
                }
            });
            
            console.log('📍 Page navigation recorded:', message.url);
        }

        startRecording() {
            this.recording = true;
            this.startTime = Date.now();
            console.log('🔴 Recording started for session:', this.sessionId);
            
            // Обновляем UI виджета
            this.updateWidgetUI();
        }

        stopRecording() {
            this.recording = false;
            
            const sessionData = {
                meta: {
                    sessionId: this.sessionId,
                    timestamp: new Date().toISOString(),
                    startTime: this.startTime,
                    duration: Date.now() - this.startTime,
                    url: this.currentUrl,
                    totalActions: this.actions.length,
                    enhancedMode: true,
                    universalMonitor: true,
                    llmOptimized: true
                },
                actions: this.actions,
                errors: this.errors,
                pageContext: {
                    title: document.title,
                    url: window.location.href,
                    timestamp: Date.now(),
                    viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight
                    }
                }
            };

            // Отправляем в background для сохранения
            chrome.runtime.sendMessage({
                action: 'save_enhanced_session',
                data: sessionData
            });

            console.log('⏹️ Recording stopped. Actions recorded:', this.actions.length);
            
            // Обновляем UI виджета
            this.updateWidgetUI();
        }

        setupErrorHandling() {
            // Глобальный обработчик JavaScript ошибок
            window.addEventListener('error', (event) => {
                const errorData = {
                    type: 'javascript_error',
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    stack: event.error?.stack,
                    timestamp: Date.now(),
                    url: window.location.href
                };
                
                this.errors.push(errorData);
                this.updateWidgetUI();
                
                console.warn('JS Error recorded:', errorData);
            });

            // Обработчик unhandled promises
            window.addEventListener('unhandledrejection', (event) => {
                const errorData = {
                    type: 'unhandled_promise',
                    message: event.reason?.message || 'Unhandled Promise Rejection',
                    stack: event.reason?.stack,
                    timestamp: Date.now(),
                    url: window.location.href
                };
                
                this.errors.push(errorData);
                this.updateWidgetUI();
                
                console.warn('Promise rejection recorded:', errorData);
            });
        }

        // === ENHANCED WIDGET METHODS ===
        createEnhancedWidget() {
            // Удаляем существующий виджет, если есть
            const existingWidget = document.getElementById('debug-widget');
            if (existingWidget) {
                existingWidget.remove();
            }
            
            // Ждем полной загрузки DOM
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.createWidgetElement();
                });
            } else {
                // Добавляем небольшую задержку для гарантии готовности DOM
                setTimeout(() => this.createWidgetElement(), 100);
            }
        }
        
        createWidgetElement() {
            try {
                // Дополнительная проверка готовности DOM
                if (!document.body) {
                    console.warn('⚠️ Document body still not ready, retrying...');
                    setTimeout(() => this.createWidgetElement(), 1000);
                    return;
                }
                
                // Загружаем сохраненную позицию
                const savedPosition = this.loadWidgetPosition();
                
                const widget = document.createElement('div');
                widget.id = 'debug-widget';
                widget.innerHTML = `
                    <div id="widget-header" style="display: flex; align-items: center; margin-bottom: 8px; cursor: move;">
                        <span style="font-size: 16px; margin-right: 6px;">🤖</span>
                        <strong>Enhanced Debug Pro v2.1</strong>
                        <span style="margin-left: auto; font-size: 8px; color: #666;">✅</span>
                    </div>
                    <div style="font-size: 10px; color: #888; margin-bottom: 8px;">
                        Session: ${this.sessionId.substr(-8)}
                    </div>
                    <div id="recording-status-enhanced" style="margin-bottom: 4px;">⏸️ Not Recording</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 10px;">
                        <div>Events: <span id="event-count-enhanced" style="color: #4CAF50;">0</span></div>
                        <div>Errors: <span id="error-count-enhanced" style="color: #f44336;">0</span></div>
                        <div>Significance: <span id="significance-score" style="color: #2196F3;">0.0</span></div>
                        <div>LLM Ready: <span id="llm-ready-status" style="color: #FF9800;">No</span></div>
                    </div>
                    <div style="font-size: 9px; color: #666; margin: 4px 0;">📊 CDP: Off (stability mode)</div>
                    <button id="toggle-recording-enhanced" style="margin-top: 8px; width: 100%; background: linear-gradient(135deg, #007cba, #0056b3); 
                                   color: white; border: none; padding: 6px; border-radius: 4px; 
                                   cursor: pointer; font-size: 11px; transition: all 0.2s;">
                        🔴 Start Enhanced Recording
                    </button>
                `;
                
                // Применяем стили
                widget.style.cssText = `
                    position: fixed; 
                    top: ${savedPosition.y}px; 
                    left: ${savedPosition.x}px; 
                    z-index: 999999; 
                    background: linear-gradient(135deg, #1a1a1a, #2d2d2d); 
                    color: white; 
                    padding: 12px; 
                    border-radius: 8px; 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace; 
                    font-size: 11px; 
                    box-shadow: 0 4px 20px rgba(0,0,0,0.4); 
                    border: 1px solid #333; 
                    cursor: move; 
                    user-select: none;
                    width: 220px;
                    min-height: 140px;
                    display: block;
                    visibility: visible;
                    opacity: 1;
                `;
                
                // Добавляем в body только если он доступен
                if (document.body) {
                    document.body.appendChild(widget);
                    
                    // Добавляем drag & drop функциональность
                    this.makeDraggable(widget);
                    
                    // Обработчик кнопки записи
                    const button = document.getElementById('toggle-recording-enhanced');
                    if (button) {
                        button.addEventListener('click', () => {
                            if (this.recording) {
                                this.stopRecording();
                            } else {
                                this.startRecording();
                            }
                        });
                    }
                    
                    // Обновляем UI
                    this.updateWidgetUI();
                    
                    console.log('✅ Enhanced Debug Pro widget created successfully');
                } else {
                    console.warn('⚠️ Document body not ready for widget injection');
                    // Повторяем попытку через 500ms
                    setTimeout(() => this.createWidgetElement(), 500);
                }
            } catch (error) {
                console.error('❌ Widget creation failed:', error);
            }
        }
        
        hideWidget() {
            const widget = document.getElementById('debug-widget');
            if (widget) {
                widget.remove();
                console.log('🔧 Widget hidden');
            }
        }
        
        toggleWidget() {
            const widget = document.getElementById('debug-widget');
            if (widget) {
                this.hideWidget();
            } else {
                this.createEnhancedWidget();
            }
        }

        makeDraggable(element) {
            let isDragging = false;
            let dragOffset = { x: 0, y: 0 };
            
            const header = element.querySelector('#widget-header');
            
            header.addEventListener('mousedown', (e) => {
                isDragging = true;
                dragOffset.x = e.clientX - element.offsetLeft;
                dragOffset.y = e.clientY - element.offsetTop;
                
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
                
                e.preventDefault();
            });
            
            const onMouseMove = (e) => {
                if (!isDragging) return;
                
                const newX = e.clientX - dragOffset.x;
                const newY = e.clientY - dragOffset.y;
                
                // Ограничиваем перемещение границами экрана
                const maxX = window.innerWidth - element.offsetWidth;
                const maxY = window.innerHeight - element.offsetHeight;
                
                const boundedX = Math.max(0, Math.min(newX, maxX));
                const boundedY = Math.max(0, Math.min(newY, maxY));
                
                element.style.left = boundedX + 'px';
                element.style.top = boundedY + 'px';
            };
            
            const onMouseUp = () => {
                if (isDragging) {
                    isDragging = false;
                    
                    // Сохраняем позицию
                    this.saveWidgetPosition({
                        x: parseInt(element.style.left),
                        y: parseInt(element.style.top)
                    });
                    
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                }
            };
        }

        updateWidgetUI() {
            const eventCount = document.getElementById('event-count-enhanced');
            const errorCount = document.getElementById('error-count-enhanced');
            const significanceScore = document.getElementById('significance-score');
            const llmReady = document.getElementById('llm-ready-status');
            const recordingStatus = document.getElementById('recording-status-enhanced');
            const toggleButton = document.getElementById('toggle-recording-enhanced');
            
            if (eventCount) eventCount.textContent = this.actions.length;
            if (errorCount) errorCount.textContent = this.errors.length;
            
            if (significanceScore) {
                const avgSignificance = this.actions.length > 0 
                    ? this.actions.reduce((sum, a) => sum + (a.significance || 0.5), 0) / this.actions.length 
                    : 0;
                significanceScore.textContent = avgSignificance.toFixed(2);
            }
            
            if (llmReady) {
                const ready = this.actions.length > 5;
                llmReady.textContent = ready ? 'Yes' : 'No';
                llmReady.style.color = ready ? '#4CAF50' : '#FF9800';
            }
            
            if (recordingStatus) {
                recordingStatus.textContent = this.recording ? '🔴 Recording...' : '⏸️ Not Recording';
            }
            
            if (toggleButton) {
                toggleButton.textContent = this.recording ? 'Stop Recording' : 'Start Recording';
                toggleButton.style.background = this.recording 
                    ? 'linear-gradient(135deg, #f44336, #d32f2f)' 
                    : 'linear-gradient(135deg, #007cba, #0056b3)';
            }
        }

        loadWidgetPosition() {
            try {
                const saved = localStorage.getItem('debug-widget-position');
                if (saved) {
                    return JSON.parse(saved);
                }
            } catch (e) {
                console.warn('Failed to load widget position:', e);
            }
            
            // Позиция по умолчанию (правый верхний угол)
            return { x: window.innerWidth - 220, y: 10 };
        }

        saveWidgetPosition(position) {
            try {
                localStorage.setItem('debug-widget-position', JSON.stringify(position));
            } catch (e) {
                console.warn('Failed to save widget position:', e);
            }
        }
    }

    // Инициализация с улучшенной обработкой готовности DOM
    function initializeRecorder() {
        // Проверяем множественную инициализацию
        if (window.enhancedPrestaShopRecorder) {
            console.log('✅ Recorder already initialized');
            return;
        }
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    if (!window.enhancedPrestaShopRecorder) {
                        window.enhancedPrestaShopRecorder = new FixedPrestaShopRecorder();
                    }
                }, 500); // Дополнительная задержка после DOMContentLoaded
            });
        } else {
            // DOM уже загружен
            setTimeout(() => {
                if (!window.enhancedPrestaShopRecorder) {
                    window.enhancedPrestaShopRecorder = new FixedPrestaShopRecorder();
                }
            }, 100); // Небольшая задержка для гарантии
        }
    }
    // ИСПРАВЛЕНИЕ: Message listener для popup communication
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'ping') {
            sendResponse({ success: true });
            return true;
        }
        
        if (request.action === 'get_enhanced_state') {
            const recorder = window.enhancedPrestaShopRecorder;
            if (recorder) {
                sendResponse({
                    enhancedMode: true,
                    recording: recorder.isRecording,
                    paused: recorder.isPaused,
                    sessionData: recorder.actions?.length || 0,
                    startTime: recorder.startTime
                });
            } else {
                sendResponse({ enhancedMode: false });
            }
            return true;
        }
        
        return false;
    });

    // Запуск
    initializeRecorder();

})();