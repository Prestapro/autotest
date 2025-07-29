// ADVANCED EVENT TRACKER для DevTools Panel
// Фиксирует ВСЕ пользовательские действия с точными селекторами

(function() {
    'use strict';

    class AdvancedEventTracker {
        constructor() {
            this.events = [];
            this.isActive = false;
            this.lastUrl = window.location.href;
            this.init();
        }

        init() {
            this.setupEventListeners();
            this.trackUrlChanges();
            console.log('🔍 Advanced Event Tracker initialized');
        }

        // Генерируем точный селектор
        generateAdvancedSelector(element) {
            if (!element || !element.tagName) return 'unknown';

            // ID приоритет #1
            if (element.id) {
                return `#${element.id}`;
            }

            // data-testid приоритет #2
            if (element.dataset?.testid) {
                return `[data-testid="${element.dataset.testid}"]`;
            }

            // name attribute приоритет #3
            if (element.name) {
                return `[name="${element.name}"]`;
            }

            // class + tagName приоритет #4
            if (element.className && typeof element.className === 'string') {
                const classes = element.className.split(' ')
                    .filter(c => c.trim() && !c.match(/^(js-|temp-|hover|active|focus)/))
                    .slice(0, 2);
                if (classes.length > 0) {
                    return `${element.tagName.toLowerCase()}.${classes.join('.')}`;
                }
            }

            // Nested path для уникальности
            return this.generatePath(element);
        }

        generatePath(element) {
            const path = [];
            let current = element;
            
            while (current && current.tagName) {
                let selector = current.tagName.toLowerCase();
                
                if (current.id) {
                    path.unshift(`#${current.id}`);
                    break;
                }
                
                if (current.className) {
                    const mainClass = current.className.split(' ')[0];
                    if (mainClass) {
                        selector += `.${mainClass}`;
                    }
                }
                
                path.unshift(selector);
                current = current.parentElement;
                
                if (path.length > 4) break; // Ограничиваем глубину
            }
            
            return path.join(' > ');
        }

        // Фиксируем все события
        setupEventListeners() {
            // CLICKS - детальная фиксация
            document.addEventListener('click', (e) => {
                this.trackEvent('CLICK', e.target, {
                    text: this.getElementText(e.target),
                    coordinates: { x: e.clientX, y: e.clientY },
                    modifiers: {
                        ctrl: e.ctrlKey,
                        shift: e.shiftKey,
                        alt: e.altKey
                    }
                });
            }, true);

            // FORM INTERACTIONS
            document.addEventListener('input', (e) => {
                if (e.target.type === 'password') {
                    this.trackEvent('INPUT', e.target, {
                        value: '[PASSWORD]',
                        length: e.target.value.length
                    });
                } else {
                    this.trackEvent('INPUT', e.target, {
                        value: e.target.value,
                        placeholder: e.target.placeholder
                    });
                }
            }, true);

            document.addEventListener('change', (e) => {
                let value = e.target.value;
                if (e.target.type === 'file') {
                    value = Array.from(e.target.files).map(f => f.name).join(', ');
                }
                
                this.trackEvent('CHANGE', e.target, {
                    value: value,
                    type: e.target.type
                });
            }, true);

            // SELECT/DROPDOWN
            document.addEventListener('focus', (e) => {
                if (e.target.tagName === 'SELECT') {
                    this.trackEvent('SELECT_OPEN', e.target, {
                        options: Array.from(e.target.options).map(opt => ({
                            value: opt.value,
                            text: opt.text
                        }))
                    });
                }
            }, true);

            // MODAL/POPUP detection
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            if (this.isModal(node)) {
                                this.trackEvent('MODAL_SHOW', node, {
                                    modalType: this.getModalType(node)
                                });
                            }
                        }
                    });
                    
                    mutation.removedNodes.forEach((node) => {
                        if (node.nodeType === 1 && this.isModal(node)) {
                            this.trackEvent('MODAL_HIDE', node, {
                                modalType: this.getModalType(node)
                            });
                        }
                    });
                });
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            // MENU interactions
            document.addEventListener('mouseenter', (e) => {
                if (this.isMenu(e.target)) {
                    this.trackEvent('MENU_HOVER', e.target, {});
                }
            }, true);

            // KEYBOARD shortcuts
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey || e.altKey || e.metaKey) {
                    this.trackEvent('KEYBOARD_SHORTCUT', e.target, {
                        key: e.key,
                        code: e.code,
                        modifiers: {
                            ctrl: e.ctrlKey,
                            alt: e.altKey,
                            meta: e.metaKey,
                            shift: e.shiftKey
                        }
                    });
                }
            }, true);

            // SCROLL tracking
            let scrollTimeout;
            window.addEventListener('scroll', () => {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    this.trackEvent('SCROLL', document.documentElement, {
                        scrollTop: window.pageYOffset,
                        scrollLeft: window.pageXOffset
                    });
                }, 150);
            });
        }

        // Детекторы UI элементов
        isModal(element) {
            const modalSelectors = [
                '.modal', '.popup', '.overlay', '.dialog',
                '[role="dialog"]', '[role="modal"]',
                '.fancybox', '.lightbox', '.tooltip'
            ];
            
            return modalSelectors.some(selector => 
                element.matches && element.matches(selector)
            ) || element.style.position === 'fixed';
        }

        getModalType(element) {
            if (element.classList.contains('tooltip')) return 'tooltip';
            if (element.classList.contains('notification')) return 'notification';
            if (element.classList.contains('alert')) return 'alert';
            return 'modal';
        }

        isMenu(element) {
            const menuSelectors = [
                '.menu', '.nav', '.dropdown', '.submenu',
                '[role="menu"]', '[role="menubar"]'
            ];
            
            return menuSelectors.some(selector => 
                element.matches && element.matches(selector)
            );
        }

        getElementText(element) {
            if (!element) return '';
            
            // Для кнопок/ссылок - точный текст
            if (['BUTTON', 'A', 'SPAN'].includes(element.tagName)) {
                return element.textContent?.trim().slice(0, 100) || '';
            }
            
            // Для input - placeholder или value
            if (element.tagName === 'INPUT') {
                return element.placeholder || element.value || '';
            }
            
            return element.textContent?.trim().slice(0, 50) || '';
        }

        // URL change tracking
        trackUrlChanges() {
            // History API override
            const originalPushState = history.pushState;
            const originalReplaceState = history.replaceState;
            
            history.pushState = function(...args) {
                originalPushState.apply(this, args);
                window.dispatchEvent(new Event('urlchange'));
            };
            
            history.replaceState = function(...args) {
                originalReplaceState.apply(this, args);
                window.dispatchEvent(new Event('urlchange'));
            };
            
            window.addEventListener('popstate', () => {
                window.dispatchEvent(new Event('urlchange'));
            });
            
            window.addEventListener('urlchange', () => {
                if (this.lastUrl !== window.location.href) {
                    this.trackEvent('URL_CHANGE', document, {
                        from: this.lastUrl,
                        to: window.location.href
                    });
                    this.lastUrl = window.location.href;
                }
            });
        }

        // Основной метод фиксации
        trackEvent(type, element, data = {}) {
            if (!this.isActive) return;

            const event = {
                type: type,
                timestamp: Date.now(),
                url: window.location.href,
                selector: this.generateAdvancedSelector(element),
                element: {
                    tag: element?.tagName?.toLowerCase() || 'unknown',
                    id: element?.id || '',
                    className: element?.className || '',
                    text: this.getElementText(element)
                },
                data: data,
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            };

            this.events.push(event);

            // Отправляем в DevTools panel (с проверкой context)
            if (chrome.runtime?.id) {
                try {
                    chrome.runtime.sendMessage({
                        action: 'devtools_event',
                        event: event
                    });
                } catch (error) {
                    console.warn('DevTools communication failed:', error.message);
                }
            }

            console.log(`🎯 ${type}:`, event);

            // Ограничиваем размер массива
            if (this.events.length > 1000) {
                this.events = this.events.slice(-500);
            }
        }

        // Control methods
        start() {
            this.isActive = true;
            this.trackEvent('TRACKING_STARTED', document, {});
            console.log('▶️ Advanced tracking started');
        }

        stop() {
            this.isActive = false;
            this.trackEvent('TRACKING_STOPPED', document, {});
            console.log('⏹️ Advanced tracking stopped');
        }

        getEvents() {
            return this.events;
        }

        clearEvents() {
            this.events = [];
            console.log('🧹 Events cleared');
        }
    }

    // Global instance
    if (!window.advancedEventTracker) {
        window.advancedEventTracker = new AdvancedEventTracker();
    }

    // Message listener
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        const tracker = window.advancedEventTracker;
        
        switch (request.action) {
            case 'start_advanced_tracking':
                tracker.start();
                sendResponse({ success: true });
                break;
            case 'stop_advanced_tracking':
                tracker.stop();
                sendResponse({ success: true });
                break;
            case 'get_tracked_events':
                sendResponse({ events: tracker.getEvents() });
                break;
            case 'clear_tracked_events':
                tracker.clearEvents();
                sendResponse({ success: true });
                break;
            default:
                return false;
        }
        return true;
    });

})();
