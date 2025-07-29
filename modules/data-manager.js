// Data Manager - chrome.storage.local вместо downloads
class DataManager {
    constructor(recorder) {
        this.recorder = recorder;
        this.storageKey = 'prestashop_sessions';
    }

    async saveSession(sessionData) {
        try {
            // chrome.storage.local
            const result = await chrome.storage.local.get([this.storageKey]);
            const sessions = result[this.storageKey] || [];
            
            sessions.push({
                id: sessionData.meta.sessionId,
                timestamp: sessionData.meta.timestamp,
                data: sessionData
            });

            // Лимит 50 сессий
            if (sessions.length > 50) {
                sessions.splice(0, sessions.length - 50);
            }

            await chrome.storage.local.set({ [this.storageKey]: sessions });
            
            // Экспорт в файл (опционально)
            this.exportToFile(sessionData);
            
            console.log('✅ Session saved:', sessionData.meta.sessionId);
        } catch (error) {
            console.error('Save failed:', error);
        }
    }

    exportToFile(sessionData) {
        const blob = new Blob([JSON.stringify(sessionData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sessionData.meta.sessionId}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}