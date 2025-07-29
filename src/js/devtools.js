// PrestaShop Debug Pro Enhanced - DevTools Integration
// Создает специализированную панель в Chrome DevTools

// Создаем панель в DevTools
chrome.devtools.panels.create(
    'PrestaShop Debug Pro',
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjNDBhOWZmIi8+Cjwvc3ZnPgo=',
    'devtools-panel.html',
    function(panel) {
        console.log('PrestaShop Debug Pro DevTools panel created');
        
        // Слушаем события от панели
        panel.onShown.addListener(function(window) {
            console.log('PrestaShop Debug Pro panel shown');
        });
        
        panel.onHidden.addListener(function() {
            console.log('PrestaShop Debug Pro panel hidden');
        });
    }
);

// Интеграция с Network панелью
chrome.devtools.network.onRequestFinished.addListener(function(request) {
    // Фильтруем только PrestaShop связанные запросы
    if (request.request.url.includes('prestashop') || 
        request.request.url.includes('admin') ||
        request.request.url.includes('modules') ||
        request.request.url.includes('ajax')) {
        
        // Отправляем данные в background script для анализа
        if (chrome.runtime?.id) {
            chrome.runtime.sendMessage({
                action: 'devtools_network_event',
                data: {
                    url: request.request.url,
                    method: request.request.method,
                    status: request.response.status,
                    responseTime: request.time,
                    headers: request.request.headers,
                    postData: request.request.postData
                }
            }).catch(() => {});
        }
    }
});

// Sidebar для Elements панели
chrome.devtools.panels.elements.createSidebarPane(
    "PrestaShop Info",
    function(sidebar) {
        sidebar.setPage("devtools-sidebar.html");
        
        // Обновляем sidebar при выборе элемента
        chrome.devtools.panels.elements.onSelectionChanged.addListener(function() {
            chrome.devtools.inspectedWindow.eval(
                `
                (function() {
                    const element = $0;
                    if (!element) return null;
                    
                    return {
                        tagName: element.tagName,
                        id: element.id,
                        className: element.className,
                        prestashopClasses: element.className.split(' ').filter(cls => 
                            cls.includes('prestashop') || 
                            cls.includes('ps-') || 
                            cls.includes('product') ||
                            cls.includes('cart') ||
                            cls.includes('checkout')
                        ),
                        dataAttributes: Array.from(element.attributes)
                            .filter(attr => attr.name.startsWith('data-'))
                            .map(attr => ({ name: attr.name, value: attr.value })),
                        prestashopHooks: element.getAttribute('data-hook-name') || null,
                        isPrestaShopComponent: !!(
                            element.closest('.prestashop') ||
                            element.closest('[class*="ps-"]') ||
                            element.getAttribute('data-hook-name')
                        )
                    };
                })()
                `,
                function(result, isException) {
                    if (!isException && result) {
                        sidebar.setObject(result);
                    }
                }
            );
        });
    }
);

// Console API расширения
chrome.devtools.inspectedWindow.eval(`
    // Добавляем глобальные функции для дебага PrestaShop
    window.prestashopDebugAPI = {
        // Получить все PrestaShop модули
        getModules: function() {
            return Array.from(document.querySelectorAll('[class*="ps-"], [data-hook-name]'))
                .map(el => ({
                    element: el,
                    hook: el.getAttribute('data-hook-name'),
                    classes: Array.from(el.classList).filter(cls => cls.includes('ps-'))
                }));
        },
        
        // Найти все формы
        getForms: function() {
            return Array.from(document.forms).map(form => ({
                action: form.action,
                method: form.method,
                fields: Array.from(form.elements).map(el => ({
                    name: el.name,
                    type: el.type,
                    value: el.value
                }))
            }));
        },
        
        // Получить информацию о корзине
        getCartInfo: function() {
            const cartElements = document.querySelectorAll('[class*="cart"], [id*="cart"]');
            return Array.from(cartElements).map(el => ({
                element: el,
                text: el.textContent.trim(),
                data: Object.fromEntries(
                    Array.from(el.attributes)
                        .filter(attr => attr.name.startsWith('data-'))
                        .map(attr => [attr.name, attr.value])
                )
            }));
        },
        
        // Симулировать события для тестирования
        simulateClick: function(selector) {
            const element = document.querySelector(selector);
            if (element) {
                element.click();
                return 'Clicked: ' + selector;
            }
            return 'Element not found: ' + selector;
        }
    };
    
    console.log('🚀 PrestaShop Debug API loaded. Use prestashopDebugAPI object for advanced debugging.');
`);

console.log('🔧 PrestaShop Debug Pro DevTools integration loaded');