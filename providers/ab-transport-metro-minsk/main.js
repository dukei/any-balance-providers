var BASE_URL = 'https://metropoliten.by';
var AJAX_URL = BASE_URL + '/local/components/vosko/application/templates/.default/ajax/application.php';

function main() {
    var prefs = AnyBalance.getPreferences();
    var card = (prefs.card || '').replace(/\D/g, '');

    if (!card)
        throw new AnyBalance.Error('Укажите номер карты метро');

    if (card.length != 16)
        throw new AnyBalance.Error('Номер карты должен содержать 16 цифр');

    var html = AnyBalance.requestPost(AJAX_URL, {
        'FILTER[UF_NUMBER]': '%' + card + '%',
        'language': 'ru'
    }, {
        'BX-AJAX': 'true',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': BASE_URL + '/',
        'Origin': BASE_URL
    });

    if (!html)
        throw new AnyBalance.Error('Метрополитен не вернул данные');

    // ИСПОЛЬЗУЕМ ВСТРОЕННЫЙ МЕТОД ИЗ LIBRARY.MIN.JS
    // Убираем лишние переносы строк и множественные пробелы, оставляя один пробел
    var text = html.htmlToText().replace(/\s+/g, ' ').trim();
    
    AnyBalance.trace('Metro response: ' + text);

    if (/номер.*карт.*невер|карта.*не найд|проездн.*не найд/i.test(text))
        throw new AnyBalance.Error('Карта не найдена. Проверьте номер карты.', false, true);

    var result = {success: true};

    // Извлекаем общие данные (тип, дата окончания, последняя операция)
    var typeMatch = text.match(/(Проездной[^,]*)/i);
    var validMatch = text.match(/действует\s+по\s+(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2})/i);
    var lastMatch = text.match(/последняя\s+операция\s*-\s*(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}:\d{2})/i);

    if (typeMatch && AnyBalance.isAvailable('type'))
        result.type = typeMatch[1].trim();

    if (validMatch && AnyBalance.isAvailable('valid'))
        result.valid = parseDate(validMatch[1]); // parseDate тоже берется из library.min.js

    if (lastMatch && AnyBalance.isAvailable('lastOperation'))
        result.lastOperation = parseDate(lastMatch[1]);

    // Обрабатываем остаток поездок
    if (/без\s+лимита\s+поездок/i.test(text)) {
        // Если проездной безлимитный, счетчик поездок равен null (в приложении будет прочерк)
        if (AnyBalance.isAvailable('trips'))
            result.trips = null; 
    } else {
        // Если не безлимитный, ищем остаток цифрой
        var tripsMatch = text.match(/остаток\s+поездок\s+(\d+)/i);
        
        if (tripsMatch) {
            if (AnyBalance.isAvailable('trips'))
                result.trips = parseInt(tripsMatch[1], 10);
        } else {
            // Если ни безлимита, ни цифр не нашли - выдаем ошибку
            throw new AnyBalance.Error('Не удалось найти остаток поездок в ответе метрополитена');
        }
    }

    AnyBalance.setResult(result);
}