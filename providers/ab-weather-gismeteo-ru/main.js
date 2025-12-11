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

var replaceWind = {N: 'С', NE: 'СВ', S: 'Ю', SE: 'ЮВ', W: 'З', NW: 'СЗ', E: 'В', SW: 'ЮЗ', 'Calm': 'Ш', 'calm': 'Ш', 'Штиль': 'Ш', 'штиль': 'Ш', null: 'Ш'};

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
		html = AnyBalance.requestGet(baseurl + 'mq/city/ip/?geo=' + prefs.domen, addHeaders({Referer: baseurl}));
		AnyBalance.trace(html);
		url = getParam(html, null, null, /"url":\s*?"([^"]*)/i);
		
		if(!url){
			var json = getJson(html);
			json = json.data;
			if(json.slug && json.id)
			    url = baseurl + 'weather-' + json.slug + '-' + json.id + '/';
		}
		
		checkEmpty(url, 'Не удалось определить город по IP-адресу. Введите название города в настройках провайдера', true);
    } else {
        AnyBalance.trace('Ищем ссылку для города ' + prefs.city);
        html = AnyBalance.requestGet(baseurl + 'mq/city/q/?q=' + encodeURIComponent(prefs.city) + '&geo=' + prefs.domen + '&limit=10', addHeaders({Referer: baseurl}));
        var json = getJson(html);
        AnyBalance.trace(JSON.stringify(json));
		json = json.data;

        if (prefs.country) {
		    AnyBalance.trace('Регион указан в настройках (' + prefs.country + '). Ищем ссылку для города ' + prefs.city + ' по указанным данным');
		    if (json && json.length && json.length > 0) {
			    for(var i=0; i<json.length; i++){
					var obj = JSON.stringify(json[i]);
				    if (obj.includes(prefs.country)) {
//						url = getParam(obj, null, null, /"url":\s*?"([^"]*)/i);
						url = baseurl + 'weather-' + json[i].slug + '-' + json[i].id + '/';
					    break;
				    } else {
                        continue;
				    }
			    }
		    }
            
		    if (!url) {
		        AnyBalance.trace('Точных соответствий по указанным данным не найдено. Ищем ссылку для города ' + prefs.city + ' обычным способом');
//				url = getParam(html, null, null, /"url":\s*?"([^"]*)/i);
				url = baseurl + 'weather-' + json[0].slug + '-' + json[0].id + '/';
		    }
	     }else {
		    AnyBalance.trace('Регион не указан в настройках. Ищем ссылку для города ' + prefs.city + ' обычным способом');
//			url = getParam(html, null, null, /"url":\s*?"([^"]*)/i);
			url = baseurl + 'weather-' + json[0].slug + '-' + json[0].id + '/';
	    }

        checkEmpty(url, 'Не удалось найти ссылку для города ' + prefs.city + '. Проверьте правильность ввода названия города', true);
    }
	
	AnyBalance.trace('Нашли ссылку для  города: ' + url);

    var result = {success: false};

    result = getWeatherFromHTML(prefs, url);

    AnyBalance.setResult(result);
}

function getWeatherFromHTML(prefs, url) {
    var baseurl = 'https://www.gismeteo.' + prefs.domen + '/';
	
	var url3days = url + '3-days/';

    AnyBalance.trace('Пробуем получить прогноз на 3 дня: ' + joinUrl(baseurl, url3days));
    var html = AnyBalance.requestGet(joinUrl(baseurl, url3days), addHeaders({Referer: baseurl}));
//	AnyBalance.trace('Прогноз на 3 дня: ' + html);

    // Проверка на корректный вход
    if (AnyBalance.getLastStatusCode() == 404 || /(Ошибка 404|Klaida 404)/i.test(html)) {
        throw new AnyBalance.Error('Страница не найдена. Проверьте правильность ввода названия города');
    }

    var result = {success: true};
	
	// Город
    getParam(html, result, '__tariff', /"city":\s*?\{"name":"([^"]*)/i, replaceTagsAndSpaces);
	
	result = getWeatherForecast(html, result, prefs);
	
	if (AnyBalance.isAvailable(['rising', 'setting', 'dayLength', 'moonPhase'])) {
        AnyBalance.trace('Пробуем получить прогноз на сегодня: ' + joinUrl(baseurl, url));
        var html = AnyBalance.requestGet(joinUrl(baseurl, url), addHeaders({Referer: baseurl}));
//	    AnyBalance.trace('Прогноз на сегодня: ' + html);
	    
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
	}
	
	return result;
}

function getCurrentWeather(html, result) {
	var data = getJsonObject(html, /M.state\s*?=\s*?/), dataWeather;
	
	if (data && data.weather && data.weather.cw) {
		dataWeather = data.weather.cw;
	    
	    AnyBalance.trace('dataWeather: ' + JSON.stringify(dataWeather));
	    
        // Атмосферные явления
        if(dataWeather.description && dataWeather.description[0])
	        getParam(dataWeather.description[0], result, 'atmosphericConditions', null, null);
	    // Осадки
	    if(dataWeather.precipitation && dataWeather.precipitation[0])
	        getParam(dataWeather.precipitation[0], result, 'precipitation', null, null, parseFloat);
        // Температура
        if(dataWeather.temperatureAir && dataWeather.temperatureAir[0])
	        getParam(dataWeather.temperatureAir[0], result, 'temperature', null, null, parseFloat);
	    // По ощущению
        if(dataWeather.temperatureHeatIndex && dataWeather.temperatureHeatIndex[0])
	        getParam(dataWeather.temperatureHeatIndex[0], result, 'heat', null, null, parseFloat);
	    // Температура воды
        if(dataWeather.temperatureWater && dataWeather.temperatureWater[0])
	        getParam(dataWeather.temperatureWater[0], result, 'waterTemperature', null, null, parseFloat);
        // Атмосферное давление
        if(dataWeather.pressure && dataWeather.pressure[0])
	        getParam(dataWeather.pressure[0], result, 'pressure', null, null, parseInt);
        // Ветер
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
	    
	    // УФ-индекс
        if(dataWeather.radiation && dataWeather.radiation[0])
	        getParam(dataWeather.radiation[0], result, 'radiation', null, null, parseInt);
	    
	    // Облачность
        if(dataWeather.cloudiness && dataWeather.cloudiness[0])
	        getParam(dataWeather.cloudiness[0], result, 'cloudiness', null, null, parseInt);
	    
	    // Точка росы
        if(dataWeather.dewPoint && dataWeather.dewPoint[0])
	        getParam(dataWeather.dewPoint[0], result, 'dewPoint', null, null, parseInt);
	    
        // Время обновления
        if(dataWeather.date && dataWeather.date[0])
	        var a = getParam(dataWeather.date[0], result, 'time', null, null, parseDateISO);
    }else{
		AnyBalance.trace('Не удалось получить текущую погоду. Показываем данные из прогноза на сегодня');
	}
	
    return result;
}

function getWeatherForecast(html, result, prefs) {
	var regExpPrefix = '', tod = prefs.tod, time;
    var array = ['Ночь', 'Утро', 'День', 'Вечер'];
    
    var dt = new Date();
    var hour = dt.getHours();
    
    if (tod < 0) {
        // Если нам нужна текущая или ближайшая, то надо выбрать нужный индекс
        if (0 <= hour && hour < 6) { //Ночь
            time = tod = tod == -1 ? 0 : 1;
        } else if (6 <= hour && hour < 12) { //Утро
            time = tod = tod == -1 ? 1 : 2;
        } else if (12 <= hour && hour < 18) { //День
            time = tod = tod == -1 ? 2 : 3;
        } else { //Вечер
            tod = tod == -1 ? 3 : 0;
			time = tod == -1 ? 3 : 4;
        }
    } else {
		// Если в текущих сутках период уже наступил, выбираем период за следующие сутки
	    if (tod == 0) { //Ночь
		    time = hour < 6 ? 0 : 4;
	    } else if (tod == 1) { //Утро
		    time = hour < 12 ? 1 : 5;
	    } else if (tod == 2) { //День
		    time = hour < 18 ? 2 : 6;
	    } else { //Вечер
		    time = hour < 24 ? 3 : 7;
	    }
	}
	
	AnyBalance.trace('Выбираем прогноз на ' + array[tod]);

    // Прокручиваемая панель виджетов 
	var widgetItems = getElement(html, /<div[^>]+class="widget-items js-scroll-item"[^>]*>/i);
	
	if (!widgetItems) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось получить прогноз погоды. Сайт изменен?');
    }

	// Атмосферные явления
	var widgetWeatherConditions = getElement(widgetItems, /<div[^>]+data-row="icon-tooltip"[^>]*>/i);
	var widgetWeatherConditionsItem = getElements(widgetWeatherConditions, /<div[^>]+class="row-item"[^>]*>/ig)[time];
	AnyBalance.trace('widgetWeatherConditionsItem: ' + widgetWeatherConditionsItem);
	
	getParam(widgetWeatherConditionsItem, result, 'atmosphericConditions', /<div[^>]+data-tooltip="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
	
	// Температура
	var widgetWeatherTemperature = getElement(widgetItems, /<div[^>]+data-row="temperature-air"[^>]*>/i);
	var widgetWeatherTemperatureItem = getElements(widgetWeatherTemperature, /<div[^>]+class="value"[^>]*>/ig)[time];
	AnyBalance.trace('widgetWeatherTemperatureItem: ' + widgetWeatherTemperatureItem);
	
	getParam(widgetWeatherTemperatureItem, result, 'temperature', /<temperature-value value="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
	
	// По ощущению
	var widgetWeatherTemperatureHeat = getElement(widgetItems, /<div[^>]+data-row="temperature-heat-index"[^>]*>/i);
	var widgetWeatherTemperatureHeatItem = getElements(widgetWeatherTemperatureHeat, /<div[^>]+class="value"[^>]*>/ig)[time];
	AnyBalance.trace('widgetWeatherTemperatureHeatItem: ' + widgetWeatherTemperatureHeatItem);
	
	getParam(widgetWeatherTemperatureHeatItem, result, 'heat', /<temperature-value value="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
	
	// Атмосферное давление
	var widgetWeatherPressure = getElement(widgetItems, /<div[^>]+data-row="pressure"[^>]*>/i);
	var widgetWeatherPressureItem = getElements(widgetWeatherPressure, /<div[^>]+class="value"[^>]*>/ig)[time];
	AnyBalance.trace('widgetWeatherPressureItem: ' + widgetWeatherPressureItem);
	
	getParam(widgetWeatherPressureItem, result, 'pressure', /<pressure-value value="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
	
	// Ветер
	var widgetWeatherWind = getElement(widgetItems, /<div[^>]+data-row="wind"[^>]*>/i);
	var widgetWeatherWindItem = getElements(widgetWeatherWind, /<div[^>]+class="row-item"[^>]*>/ig)[time];
	AnyBalance.trace('widgetWeatherWindItem: ' + widgetWeatherWindItem);
	
	// Направление ветра
	var windDirection = getParam(widgetWeatherWindItem, null, null, /<div[^>]+class="wind-direction"[^>]*>[\s\S]*?<\/div>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	
	// Скорость ветра
	var windSpeed = getParam(widgetWeatherWindItem, null, null, /<div[^>]+class="wind-value wind-speed[^>]*><speed-value value="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
	
	result.wind = (replaceWind[windDirection]||windDirection) + ', ' + windSpeed + ' м/с';
	
	// Порывы ветра
	getParam(widgetWeatherWindItem, result, 'windGust', /<div[^>]+class="wind-value wind-gust[^>]*><speed-value value="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
	
	// Осадки
	var widgetWeatherPrecipitation = getElement(widgetItems, /<div[^>]+data-row="precipitation-bars"[^>]*>/i);
	var widgetWeatherPrecipitationItem = getElements(widgetWeatherPrecipitation, /<div[^>]+class="row-item"[^>]*>/ig)[time];
	AnyBalance.trace('widgetWeatherPrecipitationItem: ' + widgetWeatherPrecipitationItem);
	
	getParam(widgetWeatherPrecipitationItem, result, 'precipitation', /<div[^>]+class="item-unit[\s\S]*?"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	
	// Влажность
	var widgetWeatherHumidity = getElement(widgetItems, /<div[^>]+data-row="humidity"[^>]*>/i);
	var widgetWeatherHumidityItem = getElements(widgetWeatherHumidity, /<div[^>]+class="row-item[\s\S]*?"[^>]*>/ig)[time];
	AnyBalance.trace('widgetWeatherHumidityItem: ' + widgetWeatherHumidityItem);
	
	getParam(widgetWeatherHumidityItem, result, 'humidity', /<div[^>]+class="row-item[\s\S]*?"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	
	// УФ-индекс
	var widgetWeatherRadiation = getElement(widgetItems, /<div[^>]+data-row="radiation"[^>]*>/i);
	var widgetWeatherRadiationItem = getElements(widgetWeatherRadiation, /<div[^>]+class="row-item[\s\S]*?"[^>]*>/ig)[time];
	AnyBalance.trace('widgetWeatherRadiationItem: ' + widgetWeatherRadiationItem);
	
	getParam(widgetWeatherRadiationItem, result, 'radiation', /<div[^>]+class="row-item[\s\S]*?"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	
	// Геомагнитная активность
	var widgetWeatherGeomagnetic = getElement(widgetItems, /<div[^>]+data-row="geomagnetic"[^>]*>/i);
	var widgetWeatherGeomagneticItem = getElements(widgetWeatherGeomagnetic, /<div[^>]+class="row-item"[^>]*>/ig)[time];
	AnyBalance.trace('widgetWeatherGeomagneticItem: ' + widgetWeatherGeomagneticItem);
	
	var geomagneticText = getParam(widgetWeatherGeomagneticItem, null, null, /<div[^>]+data-tooltip="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
	var geomagneticIndex = getParam(widgetWeatherGeomagneticItem, null, null, /<div[^>]+class="item[\s\S]*?"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	
	result.geomagnetic = geomagneticText + (geomagneticIndex ? ': ' + geomagneticIndex + ' Б' : '');
	
	// Температуру воды и время прогноза можно получить только из obj с текущим прогнозом
	var waterTemp = getParam(html, result, 'waterTemperature', /"cw":[\s\S]*?"temperatureWater":\[([^\]]*)/i, null, parseFloat);
	
	// Время обновления
	var forecastTime = getParam(html, result, 'time', /"cw":[\s\S]*?"date":\[([^\]]*)/i, null, parseDateISO);
	
	// Если выбрана текущая погода, перезаписываем данные на актуальные из obj с текущим прогнозом
	result = (prefs.tod == '-1') ? getCurrentWeather(html, result) : result;
	
    return result;
}
