# 🎯 План консолидации - ВЫПОЛНЕНИЕ

## ✅ ЭТАП 1: Backup
```bash
cd /Users/alex/Downloads/prestashop-debug/chrome-extension
cp -r . ./backup-$(date +%Y%m%d-%H%M%S)
```

## ✅ ЭТАП 2: Удаление дубликатов
```bash
# Удаляем лишние манифесты
rm manifest-enhanced.json manifest-fixed-v*.json

# Удаляем дублированные content scripts  
rm content-script-fixed.js content-script-resilient.js

# Удаляем старые background scripts
rm background-enhanced-fixed-*.js background-resilient.js

# Удаляем устаревшие popup файлы
rm popup-enhanced-fixed-*.* popup-resilient.* popup-simplified.*
```

## ✅ ЭТАП 3: Создание модульной структуры
```bash
mkdir modules
touch modules/utils.js
touch modules/event-monitor.js  
touch modules/debug-widget.js
touch modules/data-manager.js
touch modules/cdp-connector.js
touch modules/cleanup-handler.js
```

## ✅ ЭТАП 4: Замещение файлов
1. manifest.json → консолидированная версия
2. content-script-enhanced.js → core-recorder.js + модули  
3. background-enhanced.js → background-service.js
4. popup-enhanced.* → popup.*

## ✅ ЭТАП 5: Тестирование
1. Загрузить в chrome://extensions/
2. Открыть localhost:8082
3. Проверить виджет
4. Начать/остановить запись
5. Проверить сохранение в chrome.storage.local

## 🔧 CDP включен по умолчанию с fallback
