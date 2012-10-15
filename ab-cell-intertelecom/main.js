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
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Проверьте логин-пароль.');
                
	var result = {success: true};
	//Название тарифа
        getParam(html, result, '__tariff', /<td[^>]*>\s*Тарифный план\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	//Основной счет (Сальдо)
        getParam(html, result, 'saldo', /<td[^>]*>\s*Сальдо\s*<\/td>\s*<td[^>]*>([^<]*)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	//Предоплаченые услуги на месяц
        getParam(html, result, 'predoplata', /<td[^>]*>\s*Предоплаченые услуги на месяц\s*<\/td>\s*<td[^>]*>([^<]*)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	//Неактивированные бонусы с 094
        getParam(html, result, 'bonus', /<td[^>]*>\s*Неактивированные бонусы \(с 094\)\s*<\/td>\s*<td[^>]*>([^<]*)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	//Предоплачение местные минуты
        getParam(html, result, 'min_local', /<td[^>]*>\s*Минуты\s*<\/td>[\s\S]*?<td[^>]*>[^<]*местные[^<]*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseSeconds);
	//Бонус по программе лояльности «Наилучшее общение»
	getParam(html, result, 'bonus_pl', /<td[^>]*>\s*Наилучшее общение\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	//Бонус facebook
	getParam(html, result, 'bonus_fb', /<td[^>]*>\s*Бонус facebook\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

	//Пакетный трафик (получаем в локальную переменную, и независимо от включенности счетчика 'traffic_paket')
        var traffic_paket = getParam(html, null, null, /<td[^>]*>\s*пакетный трафик\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	//Трафик использованный за текущую интернет сессию  (получаем в локальную переменную, и независимо от включенности счетчика 'traffic_paket_session')
        var traffic_paket_session = getParam(html,  null, null, /<td[^>]*>\s*Трафик МБ\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

	//Узнаем разницу между имеющимся Пакетным трафиком и израсходованным за текущую сессию
	if(typeof(traffic_paket) != 'undefined'){
            if(AnyBalance.isAvailable('traffic_paket'))
                result.traffic_paket = traffic_paket - (traffic_paket_session || 0); //Если вдруг traffic_paket_session не найден, то считаем его равным 0
        }
	

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

