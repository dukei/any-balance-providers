/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Температура в Москве. Источник - http://gradus.melda.ru/
*/

function main() {
    var prefs = AnyBalance.getPreferences();
	
    prefs.version = 'v3';
    prefs.critical_data_age = 30 * 60; // seconds
	
    json = AnyBalance.requestGet("https://gradus.melda.ru/data.json?anybalance." + prefs.version);
    var data = getJson(json);
	
    if (data.version.major != 1) {
        throw new AnyBalance.Error("Версия провайдера фатально устарела. Пожалуйста, обновитесь: http://anybalance.ru/catalog.php?id=ab-weather-moscow");
    }
	
    var delay = Math.round((new Date().getTime()/1000 - data.ts.data));
    if (delay > prefs.critical_data_age) {
        throw new AnyBalance.Error("Проблемы на сервере: данные устарели более чем на " + parseInt(delay / 60) + " мин.");
    }
	
    var result = {success: true};
	
    getParam('<font color="' + data.temperature_color + '">' + data.temperature + '°</font>', result, 'temperature_color');
    getParam(data.temperature, result, 'temperature');
    getParam(data.temperature, result, 'temperature_int', null, null, parseBalance);
    var ts = new Date(data.ts.data * 1000);
    getParam((ts.getDate() < 10 ? '0' : '') + (ts.getDate()) + '.' + (ts.getMonth()+1 < 10 ? '0' : '') + (ts.getMonth()+1) + '.' + ts.getFullYear() + ' ' + ts.getHours() + ':' + (ts.getMinutes() < 10 ? '0' : '') + ts.getMinutes(), result, ['ts', '__tariff']);
	
    if (prefs.show_link) {
        result['__tariff'] = "График: https://gradus.melda.ru/";
    } else {
		result['__tariff'] = result.ts;
	}

    AnyBalance.setResult(result);
}