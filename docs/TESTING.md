# 🔧 TESTING GUIDE - PrestaShop Debug Pro Enhanced v2.1

## Критические исправления ✅

### 1. CDP Monitor Errors (ИСПРАВЛЕНО)
- **Проблема**: CDP Monitor блокировал загрузку страниц
- **Решение**: CDP отключен по умолчанию для максимальной стабильности
- **Статус**: ✅ Исправлено

### 2. Drag & Drop Widget (ИСПРАВЛЕНО)
- **Проблема**: Виджет не появлялся на странице
- **Решение**: Автоматическое создание с улучшенной проверкой DOM
- **Статус**: ✅ Исправлено

### 3. Extension Context Errors (ИСПРАВЛЕНО)
- **Проблема**: Runtime errors при перезагрузке
- **Решение**: Защищенная архитектура с graceful degradation
- **Статус**: ✅ Исправлено

## 🚀 Инструкции по тестированию

### 1. Загрузка расширения
```bash
# 1. Chrome → Extensions → Developer Mode ON
# 2. "Load unpacked" → выбрать папку chrome-extension
# 3. Проверить: иконка "PrestaShop Debug Pro - FIXED VERSION" в toolbar
```

### 2. Проверка виджета
```javascript
// Открыть http://localhost:8082 (или 8080)
// Ожидать 2-3 секунды после загрузки страницы
// Виджет должен появиться в правом верхнем углу автоматически

// Если виджет НЕ появился:
// F12 → Console → проверить ошибки
// Ожидаемые логи:
// ✅ "Fixed recorder initialized successfully"
// ✅ "🎯 Attempting to create widget..."
// ✅ "Enhanced Debug Pro widget created successfully"
```

### 3. Тестирование записи
```bash
# 1. Нажать кнопку "Start Recording" в виджете
# 2. Выполнить действия: клики, ввод текста, навигация
# 3. Виджет должен показывать увеличивающиеся счетчики событий
# 4. Нажать "Stop Recording"
# 5. Проверить создание файлов в ~/Downloads/recordings/enhanced/
```

### 4. Проверка DevTools панели
```bash
# 1. F12 → вкладка "PrestaShop Debug Pro"
# 2. Проверить все кнопки: Show Widget, Hide Widget, Toggle Widget
# 3. "Copy Claude Instructions" → должен скопировать в буфер обмена
# 4. Лог должен показывать "📊 CDP disabled by default for stability"
```

## 🔍 Диагностические команды

### Console проверки
```javascript
// В консоли браузера:
console.log(window.prestashopDebugProFixed); // должно быть true
console.log(window.enhancedPrestaShopRecorder); // должен быть объект
document.getElementById('debug-widget'); // должен найти виджет
```

### Extension Background проверки
```javascript
// Chrome → Extensions → Service Worker → Inspect:
// Ожидаемые логи:
// ✅ "Enhanced monitoring ready (CDP on-demand only)"
// ✅ "CDP disabled by default for stability"
```

## ⚠️ Возможные проблемы и решения

### Виджет не появляется
```bash
# 1. Проверить готовность DOM
# 2. Увеличить задержку в content-script-enhanced.js
# 3. Manually вызвать: chrome.tabs.sendMessage(tabId, {action: 'show_widget'})
```

### CDP ошибки
```bash
# Решение: CDP отключен автоматически
# Для включения: chrome.storage.local.set({cdpEnabled: true})
# НЕ рекомендуется без необходимости
```

### Runtime.lastError
```bash
# Исправлено: все chrome.runtime вызовы защищены try/catch
# Graceful degradation при extension context invalidated
```

## 📁 Структура файлов (обновлена)

```
chrome-extension/
├── manifest.json              ✅ Исправлен (Manifest V3 compliant)
├── background-enhanced.js     ✅ Исправлен (CDP отключен)
├── content-script-enhanced.js ✅ Исправлен (автовиджет)
├── devtools-panel.js         ✅ Обновлен (новый статус CDP)
├── devtools-panel.html       ✅ Готов
├── popup-enhanced.html       ✅ Готов
├── rules.json               ✅ Исправлен (DeclarativeNetRequest)
└── TESTING.md               🆕 Этот файл
```

## 🎯 Проверочный чек-лист

- [ ] Расширение загружается без ошибок
- [ ] Виджет появляется автоматически через 2-3 секунды
- [ ] DevTools панель отвечает на все кнопки
- [ ] Recording создает файлы в ~/Downloads/recordings/enhanced/
- [ ] Chrome Console показывает успешную инициализацию
- [ ] Страницы загружаются быстро (без CDP задержек)
- [ ] Drag & drop виджета работает
- [ ] Position виджета сохраняется между сессиями

## 🚀 После тестирования

Если все пункты выполнены ✅, расширение готово к полноценному использованию для создания automation с Claude Code!

```bash
# Начать использование:
# 1. Записать пользовательские действия
# 2. Найти summary.json файлы в ~/Downloads/recordings/enhanced/
# 3. Использовать с Claude Code для мгновенной автоматизации
```