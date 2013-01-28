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

	//Трафик смартфон 
        getParam(html, result, 'traffic_night', />\s*Ночной трафик\s*<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	//Трафик ночной
        getParam(html, result, 'traffic_smart', />\s*Смартфон\s*<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	//Трафик по акции
	getParam(html, result, 'traffic_action', />\s*по акции\s*<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	
	//Дата последней абонентской активности
	sumParam(html, result, 'date_activity', /<td[^>]*>\s*Дата последней абонентской активности \(мм.гггг\)\s*<\/td>\s*<td[^>]*>([^<]*)<\/td>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);

	//Количество новостей
        getParam(html, result, 'news', />Новости <span [^>]*>([^<]*)<\/span>/i, replaceTagsAndSpaces, parseBalance);

	//Номер телефона
	getParam(html, result, 'phonet', /<td[^>]*>\s*Номер телефона\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, add380);

	AnyBalance.setResult(result);
}

function add380(str){
    return '+380' + html_entity_decode(str);
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
