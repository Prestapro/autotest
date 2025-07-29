// SafeExtensionCore - Универсальная библиотека защиты от Extension Context Invalidation
// Используется ВСЕ��И компонентами: content script, background, popup

(function(global) {
    'use strict';

    class SafeExtensionCore {
        constructor() {
            this.contextValid = false;
            this.lastContextCheck = 0;
            this.contextCacheTTL = 1000; // 1 секунда кеш
            this.retryDefaults = {
                maxRetries: 3,
                baseDelay: 200,
                maxDelay: 2000
            };
            
            this.initCore();
        }

        initCore() {
            // Инициализируем с проверкой контекста
            this.contextValid = this.checkContextSync();
            console.log(`🛡️ SafeExtensionCore initialized - Context: ${this.contextValid ? '✅' : '❌'}`);
        }

        // БАЗОВАЯ проверка контекста (синхронная, быстрая)
        checkContextSync() {
            try {
                return !!(chrome?.runtime?.id);
            } catch (error) {
                return false;
            }
        }

        // РАСШИРЕННАЯ проверка контекста с кешированием
        isContextValid() {
            const now = Date.now();
            
            // Используем кеш если он свежий
            if (now - this.lastContextCheck < this.contextCacheTTL) {
                return this.contextValid;
            }

            // Обновляем кеш
            this.contextValid = this.checkContextSync();
            this.lastContextCheck = now;
            
            return this.contextValid;
        }

        // БЕЗОПАСНАЯ отправка сообщений с retry logic
        async safeSendMessage(message, options = {}) {
            const {
                target = 'background',
                tabId = null,
                maxRetries = this.retryDefaults.maxRetries,
                baseDelay = this.retryDefaults.baseDelay
            } = options;

            for (let attempt = 0; attempt < maxRetries; attempt++) {
                try {
                    // Проверяем контекст перед каждой попыткой
                    if (!this.isContextValid()) {
                        throw new Error('Extension context invalid');
                    }

                    // Выбираем метод отправки
                    let response;
                    if (target === 'background') {
                        response = await this.sendToBackground(message);
                    } else if (target === 'content' && tabId) {
                        response = await this.sendToContentScript(tabId, message);
                    } else {
                        throw new Error(`Invalid target: ${target}`);
                    }

                    // Успешная отправка
                    return {
                        success: true,
                        data: response,
                        attempts: attempt + 1,
                        contextValid: true
                    };

                } catch (error) {
                    console.warn(`SafeCore message attempt ${attempt + 1}/${maxRetries} failed:`, error.message);

                    // Если это последняя попытка
                    if (attempt === maxRetries - 1) {
                        return {
                            success: false,
                            error: error.message,
                            attempts: attempt + 1,
                            contextValid: this.isContextValid()
                        };
                    }

                    // Exponential backoff
                    const delay = Math.min(baseDelay * Math.pow(2, attempt), this.retryDefaults.maxDelay);
                    await this.delay(delay);
                }
            }
        }

        // Отправка в background script
        async sendToBackground(message) {
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Background message timeout'));
                }, 5000);

                try {
                    chrome.runtime.sendMessage(message, (response) => {
                        clearTimeout(timeout);
                        
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                            return;
                        }
                        
                        resolve(response);
                    });
                } catch (error) {
                    clearTimeout(timeout);
                    reject(error);
                }
            });
        }

        // Отправка в content script
        async sendToContentScript(tabId, message) {
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Content script message timeout'));
                }, 3000);

                try {
                    chrome.tabs.sendMessage(tabId, message, (response) => {
                        clearTimeout(timeout);
                        
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                            return;
                        }
                        
                        resolve(response);
                    });
                } catch (error) {
                    clearTimeout(timeout);
                    reject(error);
                }
            });
        }

        // БЕЗОПАСНЫЙ доступ к storage
        async safeStorageGet(keys, options = {}) {
            const { 
                storageType = 'local',
                fallbackValue = null,
                maxRetries = 2 
            } = options;

            for (let attempt = 0; attempt < maxRetries; attempt++) {
                try {
                    if (!this.isContextValid()) {
                        throw new Error('Extension context invalid');
                    }

                    const storage = storageType === 'local' ? chrome.storage.local : chrome.storage.sync;
                    const result = await storage.get(keys);
                    
                    return {
                        success: true,
                        data: result,
                        source: 'chrome_storage'
                    };

                } catch (error) {
                    console.warn(`Storage get attempt ${attempt + 1}/${maxRetries} failed:`, error.message);
                    
                    if (attempt === maxRetries - 1) {
                        // Последняя попытка - возвращаем fallback
                        return {
                            success: false,
                            data: Array.isArray(keys) ? {} : { [keys]: fallbackValue },
                            source: 'fallback',
                            error: error.message
                        };
                    }

                    await this.delay(100 * (attempt + 1));
                }
            }
        }

        // БЕЗОПАСНАЯ запись в storage
        async safeStorageSet(data, options = {}) {
            const { 
                storageType = 'local',
                maxRetries = 2 
            } = options;

            for (let attempt = 0; attempt < maxRetries; attempt++) {
                try {
                    if (!this.isContextValid()) {
                        throw new Error('Extension context invalid');
                    }

                    const storage = storageType === 'local' ? chrome.storage.local : chrome.storage.sync;
                    await storage.set(data);
                    
                    return {
                        success: true,
                        source: 'chrome_storage'
                    };

                } catch (error) {
                    console.warn(`Storage set attempt ${attempt + 1}/${maxRetries} failed:`, error.message);
                    
                    if (attempt === maxRetries - 1) {
                        return {
                            success: false,
                            error: error.message
                        };
                    }

                    await this.delay(100 * (attempt + 1));
                }
            }
        }

        // БЕЗОПАСНЫЙ доступ к tabs API
        async safeTabsQuery(queryInfo = {}) {
            try {
                if (!this.isContextValid()) {
                    throw new Error('Extension context invalid');
                }

                const tabs = await chrome.tabs.query(queryInfo);
                return {
                    success: true,
                    data: tabs
                };

            } catch (error) {
                return {
                    success: false,
                    data: [],
                    error: error.message
                };
            }
        }

        // ЛОКАЛЬНОЕ состояние как fallback
        createLocalStateFallback(componentName) {
            const key = `safe_state_${componentName}`;
            
            return {
                async get(fallback = {}) {
                    try {
                        const stored = localStorage.getItem(key);
                        return stored ? JSON.parse(stored) : fallback;
                    } catch (error) {
                        console.warn('Local state get failed:', error.message);
                        return fallback;
                    }
                },

                async set(data) {
                    try {
                        localStorage.setItem(key, JSON.stringify({
                            ...data,
                            timestamp: Date.now()
                        }));
                        return true;
                    } catch (error) {
                        console.warn('Local state set failed:', error.message);
                        return false;
                    }
                },

                async clear() {
                    try {
                        localStorage.removeItem(key);
                        return true;
                    } catch (error) {
                        console.warn('Local state clear failed:', error.message);
                        return false;
                    }
                }
            };
        }

        // УТИЛИТАРНЫЕ функции
        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        // Создание уникального ID
        generateId(prefix = 'safe') {
            return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        // Логирование с контекстом
        log(level, message, data = null) {
            const timestamp = new Date().toISOString();
            const contextStatus = this.isContextValid() ? '✅' : '❌';
            
            console[level](`[SafeCore ${contextStatus}] ${timestamp}: ${message}`, data || '');
        }

        // Health check для диагностики
        async healthCheck() {
            const results = {
                context: this.isContextValid(),
                runtime: !!(chrome?.runtime),
                storage: false,
                tabs: false,
                timestamp: Date.now()
            };

            // Проверяем storage
            try {
                await chrome.storage.local.get('health_check');
                results.storage = true;
            } catch (error) {
                results.storage = false;
            }

            // Проверяем tabs API
            try {
                await chrome.tabs.query({ active: true });
                results.tabs = true;
            } catch (error) {
                results.tabs = false;
            }

            return results;
        }

        // Событийная система для компонентов
        createEventBus() {
            const listeners = new Map();

            return {
                on(event, callback) {
                    if (!listeners.has(event)) {
                        listeners.set(event, []);
                    }
                    listeners.get(event).push(callback);
                },

                emit(event, data) {
                    if (listeners.has(event)) {
                        listeners.get(event).forEach(callback => {
                            try {
                                callback(data);
                            } catch (error) {
                                console.warn('Event callback error:', error);
                            }
                        });
                    }
                },

                off(event, callback) {
                    if (listeners.has(event)) {
                        const callbacks = listeners.get(event);
                        const index = callbacks.indexOf(callback);
                        if (index > -1) {
                            callbacks.splice(index, 1);
                        }
                    }
                }
            };
        }
    }

    // ГЛОБАЛЬНАЯ инициализация SafeCore
    if (!global.SafeExtensionCore) {
        global.SafeExtensionCore = new SafeExtensionCore();
    }

    // Экспорт для разных окружений
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SafeExtensionCore;
    }

    if (typeof window !== 'undefined') {
        window.SafeExtensionCore = global.SafeExtensionCore;
    }

})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);