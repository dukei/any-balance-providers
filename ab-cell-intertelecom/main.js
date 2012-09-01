/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Интертелеком – первый национальный CDMA оператор.
Сайт оператора: http://www.intertelecom.ua/
Автоматическая Система Самообслуживания Абонентов (АССА): https://assa.intertelecom.ua/ru/login/
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	var html = AnyBalance.requestPost('https://assa.intertelecom.ua/ru/login/', {
		phone: prefs.phone,
		pass: prefs.pass
	});

        if(!/\?logout/i.test(html))
		throw AnyBalance.Error('Не удалось зайти в личный кабинет. Проверьте логин-пароль.');
                
	var result = {success: true};
        getParam(html, result, '__tariff', /<td>Тарифный план<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        getParam(html, result, 'saldo', /<td>Сальдо<\/td>\s*<td[^>]*>([^<]*)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'predoplata', /<td>Предоплаченые услуги на месяц<\/td>\s*<td[^>]*>([^<]*)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'bonus', /<td>Неактивированные бонусы \(с 094\)<\/td>\s*<td[^>]*>([^<]*)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'min_local', /<td[^>]*>Минуты<\/td>[\s\S]*?<td[^>]*>[^<]*местные[^<]*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseSeconds);

	AnyBalance.setResult(result);
}

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var matches = regexp.exec (html), value;
	if (matches) {
		value = matches[1];
		if (replaces) {
			for (var i = 0; i < replaces.length; i += 2) {
				value = value.replace (replaces[i], replaces[i+1]);
			}
		}
		if (parser)
			value = parser (value);

    if(param)
      result[param] = value;
	}
   return value
}

var replaceTagsAndSpaces = [/&nbsp;/g, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseSeconds(str){
    var matches = /(\d+):0*(\d+):0*(\d+)/.exec(str);
    var time;
    if(matches){
	  time = (+matches[1])*3600 + (+matches[2])*60 + (+matches[3]);
          AnyBalance.trace('Parsing seconds ' + time + ' from value: ' + str);
          return time;
    }
    AnyBalance.trace('Could not parse seconds from value: ' + str);
}

