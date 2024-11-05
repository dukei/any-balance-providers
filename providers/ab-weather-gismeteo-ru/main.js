/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
};

function main() {
    var prefs = AnyBalance.getPreferences();
    // Защита от undefined для уже созданных аккаунтов
    if (!prefs.domen) {
        prefs.domen = 'ru';
    }
    if (!prefs.lang) {
        prefs.lang = 'ru'; // В текущей версии провайдера информация берется только на русском языке
    }
    if (prefs.domen == 'lt' && prefs.lang == 'ru') {
        prefs.domen = 'lt/ru';
    }
    
    // Базовый линк
    var domain = 'www.gismeteo.' + prefs.domen;
    var baseurl = 'https://' + domain + '/';
	var url;
	
	if (/^\d+/.test(prefs.city))
		throw new AnyBalance.Error('Название города не может состоять только из цифр. Если вы используете в настройках провайдера индекс города, замените его на название');
	
	if (!prefs.city) {
        AnyBalance.trace('Город не указан в настройках. Пробуем определить по IP');
		html = AnyBalance.requestGet(baseurl + 'mq/city/ip/', addHeaders({Referer: baseurl}));
		AnyBalance.trace(html);
		url = getParam(html, null, null, /"url":\s*?"([^"]*)/i);
		
		checkEmpty(url, 'Не удалось определить город по IP-адресу. Введите название города в настройках провайдера', true);
    } else {
        AnyBalance.trace('Ищем ссылку для города ' + prefs.city);
        html = AnyBalance.requestGet(baseurl + 'mq/city/q/' + encodeURIComponent(prefs.city) + '/?limit=9', addHeaders({Referer: baseurl}));
        var json = getJson(html);
        AnyBalance.trace(JSON.stringify(json));

        if (prefs.country) {
		    AnyBalance.trace('Регион указан в настройках (' + prefs.country + '). Ищем ссылку для города ' + prefs.city + ' по указанным данным');
		    if (json.data && json.data.length > 0) {
			    for(var i=0; i<json.data.length; i++){
				    var data = json.data[i];
					var obj = JSON.stringify(data);
				    if (obj.includes(prefs.country)) {
						url = getParam(obj, null, null, /"url":\s*?"([^"]*)/i);
					    break;
				    } else {
                        continue;
				    }
			    }
		    }
            
		    if (!url) {
		        AnyBalance.trace('Точных соответствий по указанным данным не найдено. Ищем ссылку для города ' + prefs.city + ' обычным способом');
				url = getParam(html, null, null, /"url":\s*?"([^"]*)/i);
		    }
	     }else {
		    AnyBalance.trace('Регион не указан в настройках. Ищем ссылку для города ' + prefs.city + ' обычным способом');
			url = getParam(html, null, null, /"url":\s*?"([^"]*)/i);
	    }

        checkEmpty(url, 'Не удалось найти ссылку для города ' + prefs.city + '. Проверьте правильность ввода названия города', true);
    }
	
	AnyBalance.trace('Нашли ссылку для  города: ' + url);

    var result = {success: false};
	
/*	
	switch (prefs.tod) {
        case '-2':
        case '0':
        case '1':
        case '2':
        case '3':
        if (prefs.city.indexOf('_1') > 0) {
            result = getWeatherFromXML(prefs);
            break;
        }

        case '-1':
        if (prefs.city.indexOf('_1') > 0) {
            throw new AnyBalance.Error(
            'По текущему индексу города можно получить только прогноз погоды. Для получения текущей погоды введите индекс со страницы <a href="http://www.gismeteo.' +
            prefs.domen + '">Gismeteo.' + prefs.domen + '</a>.');
        }
        result = getWeatherFromHTML(prefs, url);
        break;

        default:
            throw new AnyBalance.Error("Ошибка получения выбранного прогноза. Пожалуйста, свяжитесь с разработчиками.");
        break;
    }
*/

    result = getWeatherFromHTML(prefs, url);

    AnyBalance.setResult(result);
}

function getWeatherFromHTML(prefs, url) {
    var baseurl = 'https://www.gismeteo.' + prefs.domen + '/';

    AnyBalance.trace('Пробуем перейти по адресу: ' + joinUrl(baseurl, url));
    var html = AnyBalance.requestGet(joinUrl(baseurl, url), addHeaders({Referer: baseurl}));
//	AnyBalance.trace('Прогноз: ' + html);/////////////////////////////////////////////////////////

    // Проверка на корректный вход
    if (AnyBalance.getLastStatusCode() == 404) {
        throw new AnyBalance.Error('Страница не найдена. Проверьте правильность ввода названия города');
    }
	
	var data = getJsonObject(html, /M.state\s*?=\s*?/), dataWeather;
	
	if (data && data.weather && data.weather.cw) {
		dataWeather = data.weather.cw;
	}else{
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить прогноз погоды. Сайт изменен?');
	}
	
//	if (/M\.state\.weather\.cw\.description\[0]/i.test(html)) { // Нормальное описание зачем-то вывели из объекта, добавляем принудительно
//		var conditions = getParam(html, null, null, /M\.state\.weather\.cw\.description\[\d+\] = '([^']*)/i, replaceTagsAndSpaces);
//		dataWeather.description[0] = conditions;
//	}

    var result = {success: true};
	
    // Город
    getParam(html, result, '__tariff', /"city":\s*?\{"name":"([^"]*)/i, replaceTagsAndSpaces);

    getCurrentWeather(dataWeather, result);
	
	var widgetAstroSun = getElement(html, /<div[^>]+class="astro-sun"[^>]*>/i);
	AnyBalance.trace('widgetAstroSun: ' + widgetAstroSun);
	
	var widgetAstroMoon = getElement(html, /<div[^>]+class="astro-moon"[^>]*>/i);
	AnyBalance.trace('widgetAstroMoon: ' + widgetAstroMoon);
    
    // Восход Солнца
    getParam(widgetAstroSun, result, 'rising', /Восход[^\d]*(\d+:\d+)/i, null, parseMinutes);
    // Закат Солнца
    getParam(widgetAstroSun, result, 'setting', /Заход[^\d]*(\d{2}:\d{2})/i, null, parseMinutes);
    // Долгота дня
    getParam(widgetAstroSun, result, 'dayLength', /Долгота[^\d]*(\d+\s*(?::|ч)\s*\d+)/i, [/\s*ч\s*/i, ':'], parseMinutes);
    // Фаза Луны
    getParam(widgetAstroMoon, result, 'moonPhase', /<div[^>]+class="astro-progress">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	
	return result;
}

function getCurrentWeather(dataWeather, result) {
	AnyBalance.trace('dataWeather: ' + JSON.stringify(dataWeather));
	
    // Атмосферные явления
    if(dataWeather.description && dataWeather.description[0])
	    getParam(dataWeather.description[0], result, 'atmosphericConditions', null, null);
	// Осадки
	if(dataWeather.precipitation[0] && dataWeather.precipitation[0])
	    getParam(dataWeather.precipitation[0], result, 'precipitation', null, null, parseFloat);
    // Температура
    if(dataWeather.temperatureAir && dataWeather.temperatureAir[0])
	    getParam(dataWeather.temperatureAir[0], result, 'temperature', null, null, parseFloat);
	// По ощущениям
    if(dataWeather.temperatureHeatIndex && dataWeather.temperatureHeatIndex[0])
	    getParam(dataWeather.temperatureHeatIndex[0], result, 'heat', null, null, parseFloat);
	// Температура воды
    if(dataWeather.temperatureWater && dataWeather.temperatureWater[0])
	    getParam(dataWeather.temperatureWater[0], result, 'waterTemperature', null, null, parseFloat);
    // Атмосферное давление
    if(dataWeather.pressure && dataWeather.pressure[0])
	    getParam(dataWeather.pressure[0], result, 'pressure', null, null, parseInt);
    // Ветер
	var replaceWind = {N: 'С', NE: 'СВ', S: 'Ю', SE: 'ЮВ', W: 'З', NW: 'СВ', E: 'В', SW: 'ЮЗ', null: 'Ш'};
	var wind = 0, dir, windDir;
	
	if(dataWeather.windSpeed && dataWeather.windSpeed[0])
	    wind = getParam(dataWeather.windSpeed[0], null, null, null, null, parseInt);
	if(dataWeather.windDirection && dataWeather.windDirection[0])
	    dir = dataWeather.windDirection && dataWeather.windDirection[0];
	if (dir && (dir <= 22 || dir > 336)) {
		windDir = 'N';
	} else if (dir && (dir > 22 && dir <= 67)) {
		windDir = 'NE';
	} else if (dir && (dir > 67 && dir <= 112)) {
		windDir = 'E';
	} else if (dir && (dir > 112 && dir <= 157)) {
		windDir = 'SE';
	} else if (dir && (dir > 157 && dir <= 202)) {
		windDir = 'S';
	} else if (dir && (dir > 202 && dir <= 247)) {
		windDir = 'SW';
	} else if (dir && (dir > 247 && dir <= 292)) {
		windDir = 'W';
	} else if (dir && (dir > 292 && dir <= 336)) {
		windDir = 'NW';
	} else {
		windDir = null;
	}
	
	result.wind = (replaceWind[windDir]||windDir) + ', ' + wind + ' м/с';
	
	// Порывы ветра
    if(dataWeather.windGust && dataWeather.windGust[0])
	    getParam(dataWeather.windGust[0], result, 'windGust', null, null, parseInt);
	
	// Влажность
    if(dataWeather.humidity && dataWeather.humidity[0])
	    getParam(dataWeather.humidity[0], result, 'humidity', null, null, parseInt);
	
	// Облачность
    if(dataWeather.cloudiness && dataWeather.cloudiness[0])
	    getParam(dataWeather.cloudiness[0], result, 'cloudiness', null, null, parseInt);
	
	// Точка росы
    if(dataWeather.dewPoint && dataWeather.dewPoint[0])
	    getParam(dataWeather.dewPoint[0], result, 'dewPoint', null, null, parseInt);
	
    // Время обновления
    if(dataWeather.date && dataWeather.date[0])
	    var a = getParam(dataWeather.date[0], result, 'time', null, null, parseDateISO);
    
    return result;
}

function getWeatherForecast(html, result, tod) {
    var regExpPrefix = '';
    var array = ['Утро', 'День', 'Вечер', 'Ночь'];
    if (tod < 0) {
        //Если нам нужна текущая или ближайшая, то надо выбрать нужный индекс
        var dt = new Date();
        var hour = dt.getHours();
        if (0 <= hour && hour < 6) { //Ночь
            tod = tod == -1 ? 3 : 0;
        } else if (6 <= hour && hour < 12) { //Утро
            tod = tod == -1 ? 0 : 1;
        } else if (12 <= hour && hour < 18) { //День
            tod = tod == -1 ? 1 : 2;
        } else { //Вечер
            tod = tod == -1 ? 2 : 3;
        }
        AnyBalance.trace('Выбираем прогноз на ' + array[tod]);
    }

    if (tod >= 0) {
        regExpPrefix = array[tod];

        // Фактические данные(?:[^>]*>){1}[^>]*День[\s\S]*?</tr
        var regExp = new RegExp('(?:Фактические данные|Прогноз)(?:[^>]*>){1}[^>]*' + regExpPrefix + '[\\s\\S]*?</tr>', 'i');

        var tr = getParam(html, null, null, regExp);
        if (!tr){
    	    AnyBalance.trace(html);
      	    throw new AnyBalance.Error('Не найден прогноз погоды (временная проблема). Пожалуйста, попробуйте позднее.');
        }

        getParam(tr, result, 'atmosphericConditions', /"cltext"[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(tr, result, 'temperature', /temp\s*c[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
        getParam(tr, result, 'pressure', /m_press torr[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
        getParam(tr, result, 'wind', /wind[^>]*>([\s\S]*?)<\/span/i, [/<dt[^>]*>(\S+)<\/[\s\S]*>([\s\S]*?)$/i, '$1, $2 м/с', replaceTagsAndSpaces], html_entity_decode);
        getParam(tr, result, 'humidity', /<td>(\d+)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(tr, result, 'heat', /m_temp c[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
        getParam(tr, result, 'time', /Local:\s*(\d{4}-\d{2}-\d{2}\s+\d+:\d{2})/i, [/(\d{4})-(\d{2})-(\d{2})\s+(\d+:\d{2})/, '$3/$2/$1 $4', replaceTagsAndSpaces], parseDate);
    }

    return result;

}
