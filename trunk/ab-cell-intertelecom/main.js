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
	//Украина (моб.) [100 мин]
        getParam(html, result, 'min_uk_mob', /<td[^>]*>\s*Минуты\s*<\/td>[\s\S]*?<td[^>]*>[^<]*Украина\s*\(моб.?\)[^<]*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseSeconds);

	//Россия [100 мин]
        getParam(html, result, 'min_rus', /<td[^>]*>\s*Минуты\s*<\/td>[\s\S]*?<td[^>]*>[^<]*Россия[^<]*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseSeconds);

	//Бонус по программе лояльности «Наилучшее общение»
	getParam(html, result, 'bonus_pl', /<td[^>]*>\s*Наилучшее общение\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	//Бонус facebook
	sumParam(html, result, 'bonus_fb', /<td[^>]*>\s*Бонус facebook\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//Бонус контактный номер
	sumParam(html, result, 'bonus_fb', /<td[^>]*>\s*Бонус за контактный номер\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//Бонус "Угадай код"
	sumParam(html, result, 'bonus_fb', /<td[^>]*>\s*Бонус [^>]*Угадай код[^>]*\s*<\/td>\s*<td[^>]*>([\s\S]*?) \([^<]*\)\s*<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	//Бонус «Вільний доступ»    [^>]*<\/td>
	getParam(html, result, 'bonus_vd', /<td[^>]*>\s*Бонус [^>]*Вільний доступ[^>]*\s*<\/td>\s*<td[^>]*>([\s\S]*?) \([^>]*\)\s*<\/td>/i, replaceTagsAndSpaces, parseBalance);
	//Дата Бонус контактный номер
	sumParam(html, result, 'date_bonus_fb', /<td[^>]*>\s*Бонус за контактный номер\s*<\/td>\s*<td[^>]*>\s*.* \(по ([^<]*)\)\s*</ig, replaceTagsAndSpaces, parseDate, aggregate_min);
	//Дата Бонус "Угадай код"
	sumParam(html, result, 'date_bonus_fb', /<td[^>]*>\s*Бонус [^>]*Угадай код[^>]*\s*<\/td>\s*<td[^>]*>\s*.* \(по ([^<]*)\)\s*<\/td>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
	
	//Пакетный трафик (получаем в локальную переменную, и независимо от включенности счетчика 'traffic_paket')
        var traffic_paket = sumParam(html, null, null, /<td[^>]*>\s*пакетный трафи(?:к|к \(Rev.A\)|к \(Rev.A\/Rev.B\))\s*<\/td>\s*<td[^>]*>([\s\S]*?)\s/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
        //Пакетный трафик (Rev.B)
        var traffic_paket_revb = getParam(html, null, null, /пакетный трафик \(Rev.B\)\s*<[\s\S]*?<td[^>]*>([\s\S]*?) по/i, replaceTagsAndSpaces, parseBalance);
	//Трафик использованный за текущую интернет сессию  (получаем в локальную переменную, и независимо от включенности счетчика 'traffic_paket_session')
        var traffic_paket_session = getParam(html,  null, null, /<td[^>]*>\s*Трафик МБ\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	//Узнаем разницу между имеющимся Пакетным трафиком и израсходованным за текущую сессию
	if(isset(traffic_paket)){
		if(AnyBalance.isAvailable('traffic_paket'))
            result.traffic_paket = traffic_paket - (traffic_paket_session || 0); //Если вдруг traffic_paket_session не найден, то считаем его равным 0
        }
        if(isset(traffic_paket_revb)){
		if(AnyBalance.isAvailable('traffic_paket_revb'))
            result.traffic_paket_revb = traffic_paket_revb - (traffic_paket_session || 0); //Если вдруг traffic_paket_session не найден, то считаем его равным 0
        }

	//Трафик ночной
        getParam(html, result, 'traffic_night', />\s*Ночной трафик\s*<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	//Трафик смартфон 
        getParam(html, result, 'traffic_smart', />\s*Смартфон\s*<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	//Трафик по акции
	sumParam(html, result, 'traffic_action', />\s*по акции \(Rev.A\)\s*<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	sumParam(html, result, 'traffic_action', />\s*Валентинка от Интертелеком. 1000 MB\s*<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
        sumParam(html, result, 'traffic_action', />\s*Подарок от Интертелеком. 1000 MB\s*<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    
        //Акционный счет
	getParam(html, result, 'bonus_action_current', /<td[^>]*>\s*Акционный счет на текущий месяц[^>]*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonus_action_next', /<td[^>]*>\s*Акционный счет на следующие мес.[^>]*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	
	//Трафик использованный за текущую интернет сессию  (получаем в счетчик на всякий случай)
        getParam(html,  result, 'traffic_session', /<td[^>]*>\s*Трафик МБ\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

	//Использованный трафик
	sumParam(html, result, 'traffic_it', />\s*IT\s*<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	
	//Использованный трафик
	sumParam(html, result, 'traffic_3g_turbo', />\s*3G_TURBO\s*<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	
	//Дата последней абонентской активности
	sumParam(html, result, 'date_activity', /<td[^>]*>\s*Дата последней абонентской активности \(мм.гггг\)\s*<\/td>\s*<td[^>]*>([^<]*)<\/td>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
	
	//Лояльный стаж
	getParam(html, result, 'loyalty', /<td[^>]*>\s*Лояльный стаж \(гг.мм\)\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseStazh);
	
	//Абонентский стаж
	getParam(html, result, 'mobsubscr', /<td[^>]*>\s*Абонентский стаж \(гг.мм\)\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseStazh);
	
	//Размер скидки по программе лояльности «Наилучшее общение»
	getParam(html, result, 'skidka', /<td[^>]*>\s*Лояльный стаж \(гг.мм\)\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, skidka2loyal);

	//Количество новостей
        getParam(html, result, 'news', />Новости <span [^>]*>([^<]*)<\/span>/i, replaceTagsAndSpaces, parseBalance);

	//Номер телефона
	getParam(html, result, 'phonet', /<td[^>]*>\s*Номер телефона\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, add380);
	
	//Номер телефона мобильный
	getParam(html, result, 'mobphonet', /<td[^>]*>\s*Мобильный номер\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, add380);

	AnyBalance.setResult(result);
}

function parseStazh(str){
    var matches = str.match(/(\d+)\.(\d+)/);
    if(matches){
        var val = (365*matches[1] + 30*matches[2])*86400;
        AnyBalance.trace("Parsed " + val + ' seconds from ' + str);
        return val;
    }else{
        AnyBalance.trace("Не удалось вычислить стаж из " + str);
    }
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

function skidka2loyal(str){
    var val = parseStazh(str);
    if(!isset(val))
        return;

    var skidka;
    
    if(val<7776000)
        skidka = 0;
    else if((val>=7776000)&&(val<15552000))
        skidka = 2;
    else if((val>=15552000)&&(val<63072000))
        skidka = 5;
    else if((val>=63072000)&&(val<94608000))
        skidka = 7;
    else if((val>=94608000)&&(val<157680000))
        skidka = 10;
    else if((val>=157680000)&&(val<315360000))
        skidka = 15;
    else //if((val>=315360000)&&(val<946080000))
        skidka = 20;
  
    return skidka;
}