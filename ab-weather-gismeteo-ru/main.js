/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущую погоду или прогноз погоды для выбранного города.

Сайты компании: http://www.gismeteo.ru
                http://www.gismeteo.ua
                http://www.gismeteo.lt
                http://www.gismeteo.by
                http://www.gismeteo.com - не реализовано
                http://www.gismeteo.md - не реализовано
*/


function hhmm2sec (value) {
    if (!value)
        return undefined;

    var res = /(\d{2}):(\d{2})/.exec (value);
    return (parseInt (res[1], 10) * 60 + parseInt (res[2], 10));
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
    html = html.match (/<tr class="wrow forecast"[\s\S]*?<\/tr>/g);
    if (!html) {
        throw new AnyBalance.Error ('Не найден прогноз погоды. Пожалуйста, обратитесь к автору провайдера.');
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


    return result;
}


function getWeatherFromHTML (prefs) {
    var baseurl = 'http://www.gismeteo.' + prefs.domen + '/city/daily/';

    AnyBalance.trace ('Trying open address: ' + baseurl + prefs.city);
    var html = AnyBalance.requestGet (baseurl + prefs.city);

    // Проверка неправильной пары логин/пароль
    var regexp=/<h2>Ошибка[\s\S]*?<p>([^<]*)/i;
    var res = regexp.exec (html);
    if (res)
        throw new AnyBalance.Error (res[1]);

    // Проверка на корректный вход
    //regexp = />Погода за окном<([\s\S]*)>Прогноз</i;
    regexp = /<h3\s+class=.type\w.\s*>([^<]*)/i;
    if (regexp.exec (html))
    	AnyBalance.trace ('It looks like we are in selfcare...');
    else {
        AnyBalance.trace ('Have not found weather info... Unknown error. Please contact author.');
        throw new AnyBalance.Error ('Неизвестная ошибка. Пожалуйста, свяжитесь с автором провайдера.');
    }


    var result = {success: false};

    // Город
    getParam (html, result, '__tariff', /<h3[^>]*>([^<]*)/i);

    if (prefs.tod == '-1')
      result = getCurrentWeather (html, result);
    else
      result = getWeatherForecast (html, result, prefs.tod);


    // Температура воды
    getParam (html, result, 'waterTemperature', /class="temp value m_temp c">([-+]\d+)/i, [], parseFloat);

    // Восход Солнца
    getParam (html, result, 'rising', /Восход[^\d]*(\d{2}:\d{2})/i);
    result.rising = hhmm2sec (result.rising);

    // Закат Солнца
    getParam (html, result, 'setting', /Заход[^\d]*(\d{2}:\d{2})/i);
    result.setting = hhmm2sec (result.setting);

    // Долгота дня
    getParam (html, result, 'dayLength', /Долгота[^\d]*(\d{2}:\d{2})/i);
    result.dayLength = hhmm2sec (result.dayLength);

    // Фаза Луны
    getParam (html, result, 'moonPhase', /Фаза[^\d]*((\d+%)[\s\S]*?<strong>([^<]+))/i, [/(\d+%)[\s\S]*?<strong>([^<]+)/, '$2 $1']);


    result.success = true;
    return result;
}


function win2utf (str) {
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
}


function getWeatherFromXML (prefs) {
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
}


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

    checkEmpty (prefs.city, 'Введите индекс города');

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
            throw new AnyBalance.Error ("Ошибка получения выбранного прогноза. Пожалуйста, свяжитесь с автором провайдера.");
            break;
    }

    AnyBalance.setResult (result);
}
