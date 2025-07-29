// Event Monitor - мониторинг DOM событий
class EventMonitor {
    constructor(recorder) {
        this.recorder = recorder;
        this.handlers = new Map();
    }

    startMonitoring() {
        const events = ['click', 'input', 'change', 'submit', 'focus', 'blur'];
        
        events.forEach(eventType => {
            const handler = (event) => this.handleEvent(eventType, event);
            this.handlers.set(eventType, handler);
            document.addEventListener(eventType, handler, true);
        });

        this.interceptAjax();
        console.log('✅ Event monitoring started');
    }

    handleEvent(type, event) {
        const element = event.target;
        const data = {
            element: this.recorder.utils.extractElementData(element),
            event: {
                type: event.type,
                timeStamp: event.timeStamp,
                isTrusted: event.isTrusted
            }
        };

        // Добавляем специфичные данные
        if (type === 'input' || type === 'change') {
            data.value = element.value;
        }
        if (type === 'click') {
            data.clickPosition = { x: event.clientX, y: event.clientY };
        }

        this.recorder.recordUserAction(type, data);
    }

    interceptAjax() {
        const originalFetch = window.fetch;
        const recorder = this.recorder;
        
        window.fetch = function(...args) {
            return originalFetch.apply(this, args).then(response => {
                recorder.recordUserAction('fetch', {
                    url: args[0],
                    status: response.status
                });
                return response;
            });
        };
    }

    cleanup() {
        this.handlers.forEach((handler, eventType) => {
            document.removeEventListener(eventType, handler, true);
        });
        this.handlers.clear();
    }
}