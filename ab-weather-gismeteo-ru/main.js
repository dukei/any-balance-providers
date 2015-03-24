/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main () {
    var prefs = AnyBalance.getPreferences ();
    // Защита от undefined для уже созданных аккаунтов
    if (!prefs.domen) {
		prefs.domen = 'ru';
    }
    if (!prefs.lang) {
		prefs.lang = 'ru';  // В текущей версии провайдера информация берется только на русском языке
    }
    if (prefs.domen == 'lt' && prefs.lang == 'ru') {
        prefs.domen = 'lt/ru'
    }
    checkEmpty (prefs.city, 'Введите индекс или название города!');
	// Базовый линк
	var baseurl = 'http://www.gismeteo.' + prefs.domen + '/';
	// Если не числа, значит надо сделать доп запрос для поиска индекса города
	if(!/^\d+$/i.test(prefs.city)) {
		AnyBalance.trace('Ищем ID города ' + prefs.city);
		html = AnyBalance.requestGet(baseurl + 'ajax/city_search/?searchQuery=x' + encodeURIComponent(prefs.city));
		// Нужно для того, чтобы проверить вернулся ли правильный json, иначе могут быть ошибки
		var json = getJson(html);
		AnyBalance.trace(JSON.stringify(json));
		
		var id = getParam(html, null, null, /^\{["']+(\d+)/i, [/\D/g, '']);
		
		checkEmpty(id, 'Не удалось найти ID города ' + prefs.city, true);
		AnyBalance.trace('Нашли ID города ' + prefs.city + ': ' + id);
		prefs.city = id;
	}
	
    var result = {success: false};

    switch (prefs.tod) {
        case '-2':
        case '0':
        case '1':
        case '2':
        case '3':
            if (prefs.city.indexOf ('_1') > 0) {
                result = getWeatherFromXML (prefs);
                break;
            }

        case '-1':
            if (prefs.city.indexOf ('_1') > 0) {
                throw new AnyBalance.Error ('По текущему индексу города можно получить только прогноз погоды. Для получения текущей погоды введите индекс со страницы <a href="http://www.gismeteo.' + prefs.domen + '">Gismeteo.' + prefs.domen + '</a>.');
            }
            result = getWeatherFromHTML (prefs);
            break;

        default:
            throw new AnyBalance.Error ("Ошибка получения выбранного прогноза. Пожалуйста, свяжитесь с разработчиками.");
            break;
    }

    AnyBalance.setResult (result);
}

function getWeatherFromHTML (prefs) {
    var baseurl = 'http://www.gismeteo.' + prefs.domen + '/city/daily/';

    AnyBalance.trace ('Trying open address: ' + baseurl + prefs.city + '/');
    var html = AnyBalance.requestGet (baseurl + prefs.city + '/');

    // Проверка неправильной пары логин/пароль
    var regexp=/<h2>Ошибка[\s\S]*?<p>([^<]*)/i;
    var res = regexp.exec (html);
    if (res)
        throw new AnyBalance.Error (res[1]);

    // Проверка на корректный вход
    var error = getParam(html, null, null, /Страница не найдена/i);
    if(error)
        throw new AnyBalance.Error ('Неизвестная ошибка. Пожалуйста, свяжитесь с автором провайдера.');
    if(getParam(html, null, null, /Почасовой прогноз погоды/i))
    	AnyBalance.trace ('It looks like we are in selfcare...');
    else {
        AnyBalance.trace ('Have not found weather info... Unknown error. Please contact author.');
        throw new AnyBalance.Error ('Неизвестная ошибка. Пожалуйста, свяжитесь с автором провайдера.');
    }

	var result = {success: true};
	// Город
    getParam (html, result, '__tariff', /<h3[^>]*>([^<]*)/i);
	
	result = (prefs.tod == '-1') ? getCurrentWeather (html, result) : getWeatherForecast (html, result, prefs.tod);
	// Температура воды
    getParam (html, result, 'waterTemperature', /<div[^>]+class="wicon water"[^>]*>\s*<dd[^>]+class="value m_temp c">([-+]?\d+)/i, null, parseFloat);
    // Восход Солнца
    getParam (html, result, 'rising', /Восход[^\d]*(\d{2}:\d{2})/i, null, parseMinutes);
    // Закат Солнца
    getParam (html, result, 'setting', /Заход[^\d]*(\d{2}:\d{2})/i, null, parseMinutes);
    // Долгота дня
    getParam (html, result, 'dayLength', /Долгота[^\d]*(\d{2}:\d{2})/i, null, parseMinutes);
    // Фаза Луны
    getParam (html, result, 'moonPhase', /Фаза[^\d]*((\d+%)[\s\S]*?<strong>([^<]+))/i, [/(\d+%)[\s\S]*?<strong>([^<]+)/, '$2 $1']);

    return result;
}

function getCurrentWeather (html, result) {
    // Атмосферные явления
    getParam (html, result, 'atmosphericConditions', /class="cloudness">[\s\S]*?>([^\s<]+[^<]*)/i);
    // Температура
    getParam (html, result, 'temperature', /class='value\sm_temp\sc'>((?:[-+]?|&minus;|&plus;)\d+[,.]?\d*)/i, ['&minus;', '-', '&plus;', '+'], parseFloat);
    // Атмосферное давление
    getParam (html, result, 'pressure', /class='value m_press torr'>(\d+)/i, [], parseInt);
    // Ветер
    getParam (html, result, 'wind', /<dd[^>]* ms'[^>]*>((\d+)[\s\S]*?<dt>([^<]*))/i, [/(\d+)[\s\S]*?<dt>([^<]*)/, '$2 $1м/с']);
    // Влажность
    getParam (html, result, 'humidity', /title="Влажность">(\d+)/i, [], parseInt);
    // Время обновления
    getParam (html, result, 'time', /class="icon date">([^<]*)/i,
        [/(\d{1,2})\s+(\S+)\s+(\d{4})\s+(.*)/, '$3/$2/$1 $4',
         'января',   '01',
         'февраля',  '02',
         'марта',    '03',
         'апреля',   '04',
         'мая',      '05',
         'июня',     '06',
         'июля',     '07',
         'августа',  '08',
         'сентября', '09',
         'октября',  '10',
         'ноября',   '11',
         'декабря',  '12'],
        Date.parse);

    return result;
}

function getWeatherForecast (html, result, tod) {
	var regExpPrefix = '';
	var array = ['Утро', 'День', 'Вечер', 'Ночь'];
        if(tod < 0){
		//Если нам нужна текущая или ближайшая, то надо выбрать нужный индекс
		var dt = new Date();
		var hour = dt.getHours();
		if(0 <= hour && hour < 6){ //Ночь
			tod = tod == -1 ? 3 : 0;
		}else if(6 <= hour && hour < 12){ //Утро
			tod = tod == -1 ? 0 : 1;
		}else if(12 <= hour && hour < 18){ //День
			tod = tod == -1 ? 1 : 2;
		}else{ //Вечер
			tod = tod == -1 ? 2 : 3;
		}
		AnyBalance.trace('Выбираем прогноз на ' + array[tod]);
        }

	if(tod >= 0) {
		regExpPrefix = array[tod];
		
		// Фактические данные(?:[^>]*>){1}[^>]*День[\s\S]*?</tr
		var regExp = new RegExp('(?:Фактические данные|Прогноз)(?:[^>]*>){1}[^>]*' + regExpPrefix + '[\\s\\S]*?</tr>', 'i');
	
		var tr = getParam (html, null, null, regExp);
		if(!tr)
			throw new AnyBalance.Error ('Не найден прогноз погоды. Пожалуйста, обратитесь к разработчикам.');
		
		getParam (tr, result, 'atmosphericConditions', /"cltext"[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		getParam (tr, result, 'temperature', /temp\s*c[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
		getParam (tr, result, 'pressure', /m_press torr[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
		getParam (tr, result, 'wind', /wind[^>]*>([\s\S]*?)<\/span/i, [replaceTagsAndSpaces, /([\s\S]*)/i, '$1 м/с'], html_entity_decode);
		getParam (tr, result, 'humidity', /<td>(\d+)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam (tr, result, 'heat', /m_temp c[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
		getParam (tr, result, 'time', /Local:\s*(\d{4}-\d{2}-\d{2}\s+\d+:\d{2})/i, [/(\d{4})-(\d{2})-(\d{2})\s+(\d+:\d{2})/, '$3/$2/$1 $4'], parseDate);
	}

	return result;


	// Не правильно же все, частенько показывает не то что указано в настройках
    /*html = html.match (/<tr class="wrow forecast"[\s\S]*?<\/tr>/g);
    if (!html) {
        throw new AnyBalance.Error ('Не найден прогноз погоды. Пожалуйста, обратитесь к разработчикам.');
    }

    if (tod == '-2') {
        html = html[0];
    } else {
        var hours = {'0': '0', '1': '6', '2': '12', '3': '18'};
        var found = false;
        for (var i = 0; i < html.length; i++) {
            if (html[i].indexOf (hours[tod] + ':00, Local') > 0) {
                found = true;
                html = html[i];
                break;
            }
        }
        if (found != true) {
            throw new AnyBalance.Error ('Не найден прогноз погоды. Пожалуйста, обратитесь к автору провайдера.');
        }
    }

	
	
	
    var $table = $(html);

    // Атмосферные явления
    getParamFind (result, 'atmosphericConditions', $table, 'td:nth-child(3)');

    // Температура
    getParamFind (result, 'temperature', $table, 'td:nth-child(4) span:first-child', null, ["−", "-", "+", "+"], parseInt);

    // Атмосферное давление
    getParamFind (result, 'pressure', $table, 'td:nth-child(5) span:first-child', null, null, parseInt);

    // Ветер
    var a = getParamFind (null, null, $table, 'td:nth-child(6) dt:first-child');
    var b = getParamFind (null, null, $table, 'td:nth-child(6) span:first-child', null, null, parseInt);
	result.wind = a + ' ' + b + 'м/с';

    // Влажность
    getParamFind (result, 'humidity', $table, 'td:nth-child(7)', null, null, parseInt);

    // Комфорт
    getParamFind (result, 'heat', $table, 'td:nth-child(8) span:first-child', null, ["−", "-", "+", "+"], parseInt);

    // Время
    getParam (html, result, 'time', /id="wrow-(\d{4}-\d{2}-\d{2}-\d{2})/i, [/(\d{4})-(\d{2})-(\d{2})-(\d{2})/, '$1/$2/$3 $4:00:00'], Date.parse);


    return result;*/
}
/*
function getParamFind (result, param, obj, search_str, regexp, replaces, parser)
{
    if (param && !AnyBalance.isAvailable (param))
        return;

    var value = obj.find (search_str).text();
    if (!value)
        return;

    if (regexp) {
        if (regexp.test (value))
            value = regexp.exec (value)[0];
        else
            return;
    }

    if (replaces) {
        for (var i = 0; i < replaces.length; i += 2) {
            value = value.replace (replaces[i], replaces[i+1]);
        }
    }

    if (parser)
        value = parser (value);

    if (result && param)
        result[param] = value;

    return value;
}*/




/*function win2utf (str) {
    if (str == null)
        return null;

    var result = "";
    var o_code = "";
    var i_code = "";

    for (var i = 0; i < str.length; i++) {
        i_code = str.charCodeAt (i);

        if (i_code == 184) {
            o_code = 1105;
        } else if (i_code == 168) {
            o_code = 1025;
        } else if (i_code > 191 && i_code < 256) {
            o_code = i_code + 848;
        } else {
            o_code = i_code;
        }

        result += String.fromCharCode (o_code);
     }                                                

     return result;
}*/


/*function getWeatherFromXML (prefs) {
    var baseurl = 'http://informer.gismeteo.' + prefs.domen + '/xml/';

    AnyBalance.trace ('Trying open address: ' + baseurl + prefs.city + '.xml');
    var info = AnyBalance.requestGet (baseurl + prefs.city + '.xml');

    if (info.length == 0) {
        throw new AnyBalance.Error ("Ошибка получения информации о погоде.\nВозможно, Вы ввели неверный индекс города для прогноза");
    }

    var xmlDoc = $.parseXML (info),
        $xml = $(xmlDoc);

    var $town = $xml.find ('MMWEATHER>REPORT>TOWN');
    if ($town.size () == 0)
        throw new AnyBalance.Error ("Ошибка: не найдена информация о городе");

    var result = {success: false};

    // Город
    result.__tariff = win2utf (unescape ($town.attr ('sname')));

    if (prefs.tod < 0) {
        var $forecast = $town.find ('FORECAST:first-child');
    } else
        var $forecast = $town.find ('FORECAST[tod="' + prefs.tod + '"]');
    if (!$forecast)
        throw new AnyBalance.Error ("Ошибка: не найдена информация о погоде");

    if (AnyBalance.isAvailable ('atmosphericConditions')) {
        var cloudiness = $forecast.find ('PHENOMENA').attr ('cloudiness');
        var cloudiness_str = {'0': 'ясно',
                              '1': 'малооблачно',
                              '2': 'облачно',
                              '3': 'пасмурно'};
        var precipitation = $forecast.find ('PHENOMENA').attr ('precipitation');
        var precipitation_str = {'4' : 'дождь',
                                 '5' : 'ливень',
                                 '6' : 'снег',
                                 '7' : 'снег',
                                 '8' : 'гроза',
                                 '9' : 'нет данных',
                                 '10': 'без осадков'};
        if (cloudiness_str[cloudiness] || precipitation_str[precipitation]) {
            result.atmosphericConditions = '';
            if (cloudiness_str[cloudiness])
                result.atmosphericConditions += cloudiness_str[cloudiness];

            if (precipitation_str[precipitation]) {
                if (result.atmosphericConditions != '')
                    result.atmosphericConditions += ', ';
                result.atmosphericConditions += precipitation_str[precipitation];
            }
        }
    }

    if (AnyBalance.isAvailable ('temperature')) {
        var min = parseInt ($forecast.find ('TEMPERATURE').attr ('min'));
        var max = parseInt ($forecast.find ('TEMPERATURE').attr ('max'));
        result.temperature = (min + max) / 2;
    }

    if (AnyBalance.isAvailable ('pressure')) {
        var min = parseInt ($forecast.find ('PRESSURE').attr ('min'));
        var max = parseInt ($forecast.find ('PRESSURE').attr ('max'));
        result.pressure = (min + max) / 2;
    }

    if (AnyBalance.isAvailable ('wind')) {
        var min = parseInt ($forecast.find ('WIND').attr ('min'));
        var max = parseInt ($forecast.find ('WIND').attr ('max'));
        var direction = $forecast.find ('WIND').attr ('direction');
        var direction_str = {'0': 'С',
                             '1': 'СВ',
                             '2': 'В',
                             '3': 'ЮВ',
                             '4': 'Ю',
                             '5': 'ЮЗ',
                             '6': 'З',
                             '7': 'СЗ'};
        result.wind = direction_str[direction] + ' ' + (min + max) / 2 + 'м/с';
    }

    if (AnyBalance.isAvailable ('humidity')) {
        var min = parseInt ($forecast.find ('RELWET').attr ('min'));
        var max = parseInt ($forecast.find ('RELWET').attr ('max'));
        result.humidity = (min + max) / 2;
    }

    if (AnyBalance.isAvailable ('heat')) {
        var min = parseInt ($forecast.find ('HEAT').attr ('min'));
        var max = parseInt ($forecast.find ('HEAT').attr ('max'));
        result.heat = (min + max) / 2;
    }

    if (AnyBalance.isAvailable ('time')) {
        var day = parseInt ($forecast.attr ('day'), 10);
        var month = parseInt ($forecast.attr ('month'), 10);
        var year = parseInt ($forecast.attr ('year'), 10);
        var hour = parseInt ($forecast.attr ('hour'), 10);
        result.time = (new Date (year, month - 1, day, hour)).valueOf ();
    }

    result.success = true;
    return result;
}*/



