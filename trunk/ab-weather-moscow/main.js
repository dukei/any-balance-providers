/*
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Температура в Москве. Источник - http://gradus.melda.ru/
*/

function main() {
    var prefs = AnyBalance.getPreferences();

    prefs.version = 'v1.3.6';
    prefs.critical_data_age = 30 * 60; // seconds

    json = AnyBalance.requestGet("http://gradus.melda.ru/data.json?anybalance." + prefs.version);

    try {
      var data = JSON.parse(json);
    } catch (e) {
      throw new AnyBalance.Error("Ошибка парсинга JSON-данных.");
    }

    var delay = Math.round((new Date().getTime()/1000 - data.ts.data));
    if (delay > prefs.critical_data_age) {
      throw new AnyBalance.Error("Проблемы на сервере: данные устарели более чем на " + parseInt(delay / 60) + " мин.");
    }
        
    var result = {success: true};

    result['temperature_color'] = '<font color="' + data.temperature_color + '">' + data.temperature + '°</font>';
    result['temperature'] = data.temperature;
    result['__tariff'] = "http://gradus.melda.ru/";

    AnyBalance.setResult(result);
}
