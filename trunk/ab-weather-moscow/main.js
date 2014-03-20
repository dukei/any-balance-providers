/*
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Температура в Москве. Источник - http://gradus.melda.ru/
*/

function main() {
    var prefs = AnyBalance.getPreferences();

    prefs.version = 'v3';
    prefs.critical_data_age = 30 * 60; // seconds

    json = AnyBalance.requestGet("https://gradus.melda.ru/data.json?anybalance." + prefs.version);

    try {
        var data = JSON.parse(json);
    } catch (e) {
        throw new AnyBalance.Error("Ошибка парсинга JSON-данных.");
    }

    if (data.version.major != 1) {
        throw new AnyBalance.Error("Версия провайдера фатально устарела. Пожалуйста, обновитесь: http://anybalance.ru/catalog.php?id=ab-weather-moscow");
    }

    var delay = Math.round((new Date().getTime()/1000 - data.ts.data));
    if (delay > prefs.critical_data_age) {
        throw new AnyBalance.Error("Проблемы на сервере: данные устарели более чем на " + parseInt(delay / 60) + " мин.");
    }

    var result = {success: true};

    result['temperature_color'] = '<font color="' + data.temperature_color + '">' + data.temperature + '°</font>';
    result['temperature'] = data.temperature;
    result['temperature_int'] = parseFloat(data.temperature);

    var ts = new Date(data.ts.data * 1000);
    result['ts'] = ts.getDate() + '.' + (ts.getMonth()+1 < 10 ? '0' : '') + (ts.getMonth()+1) + '.' + ts.getFullYear() + ' ' + ts.getHours() + ':' + (ts.getMinutes() < 10 ? '0' : '') + ts.getMinutes();

    if (prefs.show_link) {
        result['__tariff'] = "График: https://gradus.melda.ru/";
    }

    AnyBalance.setResult(result);
}
