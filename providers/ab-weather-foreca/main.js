/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.foreca.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	/* Проверяем не забыл ли пользователь ввести данные */

	checkEmpty(prefs.city_name, 'Введите название города!');
	var city_name = prefs.city_name.replace(/^\s\s*|\s\s*$/g, '');
	if(prefs.country_name)
		var country_name = prefs.country_name.replace(/^\s\s*|\s\s*$/g, '');

	/* Проверяем доступность ресурса */

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}

	// Устанавливаем куки региональных настроек, на всякий случай
	AnyBalance.setCookie('www.foreca.ru', 'fcaSettings-v2', '{"units":{"temp":"C","wind":"ms","rain":"mm","pres":"mmHg","vis":"km"},"time":"24h","theme":"light","language":"ru"}', {path: '/'});

	/* Проверяем доступность прогноза для указанного города */
	
	html = AnyBalance.requestGet('https://api.foreca.net/locations/search/' + encodeURIComponent(city_name) + '.json?limit=30&format=legacy&ppl=true&lang=ru', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при определении города! Попробуйте еще раз позже');
	}
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	if(json.results && json.results.length > 0){
	    var rxCity = new RegExp(city_name, 'i');
		var rxCountry = new RegExp(country_name, 'i');
		var cityname, admname, countryname;
		
		for(var i=0; i<json.results.length; i++){
			var res = json.results[i];
			AnyBalance.trace('Найден город: ' + res.name + ' (' + res.admName + ' - ' + res.countryName + ')');
			if(!prefs.country_name || prefs.country_name == ''){
				if(res.name.match(rxCity)){
					cityname = res.defaultName;
			        admname = res.defaultAdmName;
			        countryname = res.defaultCountryName;
					AnyBalance.trace('Регион не указан в настройках. Выбираем первый соответствующий названию город: ' + res.name
					+ ' (' + res.admName + ' - ' + res.countryName + ')');
			    	break;
			    }else{
					continue;
				}
			}else{
			    if((res.countryName.match(rxCountry) || res.admName.match(rxCountry)) && res.name.match(rxCity)){
					cityname = res.defaultName;
			        admname = res.defaultAdmName;
			        countryname = res.defaultCountryName;
				    AnyBalance.trace('Регион указан в настройках (' + country_name + '). Выбираем первый соответствующий настройкам город: ' + res.name
					+ ' (' + res.admName + ' - ' + res.countryName + ')');
					break;
				}else{
                    continue;
				}
			}
		}
		
		if(!countryname && !cityname){
			res = json.results[0];
			cityname = res.defaultName;
			admname = res.defaultAdmName;
			countryname = res.defaultCountryName;
			AnyBalance.trace('Точных соответствий не найдено. Выбираем первый город из списка предложенных: ' + res.name
			+ ' (' + res.admName + ' - ' + res.countryName + ')');
		}
		
		if(!countryname && !cityname){ // Для перехода на страницу прогноза достаточно страны и города
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось определить город. Сайт изменен?');
		}
		
		var url = countryname;
		if(admname)
		    url += '/' + admname;
		url += '/' + cityname;
	}
	
	AnyBalance.trace('Пробуем перейти по адресу: ' + baseurl + url.replace(/\s/g, '%20'));
	
	var html = AnyBalance.requestGet(baseurl + url.replace(/\s/g, '%20'), g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при получении прогноза! Попробуйте еще раз позже');
	}

	var result = {success: true};
    
	var city = getParam(html, null, null, /<div[^>]+class="header"><h2>([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces);
	if (city) {
		result.__tariff = city;
	} else if (!city && prefs.city_name) {
		result.__tariff = prefs.city_name;
	} else {
		result.__tariff = null;
	}

	var data = getJsonObject(html, /window.renderObservations\s*?\(/);
	
	if(!data) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить прогноз. Сайт изменен?');
	}
	
	if(data.obs && data.obs.length > 0){ // Некоторые станции отдают не все данные по погоде
		var info;
		
		for(var i=0; i<data.obs.length; i++){
			var dataObs = data.obs[i];
			
			AnyBalance.trace('Найдена станция: ' + dataObs.stationName + ' (' + dataObs.dist + ' км)');
			if(!dataObs.wx || !dataObs.presmmhg || !dataObs.vis){
				AnyBalance.trace('Данные станции ' + dataObs.stationName + ' ограничены. Пробуем следующую...');
				continue;
			}else{
				AnyBalance.trace('Данные станции ' + dataObs.stationName + ' полноценны. Выбираем эту станцию');
				info = dataObs;
				break;
			}
		}
		
		if(!info){
			var info = data.obs[0];
			AnyBalance.trace('Полноценных данных не найдено. Выбираем первую станцию из списка: ' + info.stationName + ' (' + info.dist + ' км)');
		}
		
		if(!info){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось определить станцию. Сайт изменен?');
		}
	}
	
	AnyBalance.trace('Фактическая погода: ' + JSON.stringify(info));
	
	var wind = getParam(info.winds, null, null, null, null, parseBalance);
	var replaceWind = ['N', 'С', 'NE', 'СВ', 'S', 'Ю', 'SE', 'ЮВ', 'W', 'З', 'NW', 'СВ', 'E', 'В', 'SW', 'ЮЗ'];
	var windDir = getParam(info.windCardinal, null, null, null, replaceWind);
	
	if (!windDir) { // Если не получили буквенное направление ветра, рассчитываем из градусов
		var dir = info.windd;
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
	}
	
	if(!windDir || !wind || wind == 0){
	    result.wind = 'Ш, 0 м/с'; // Форека отдаёт противоречащие данных по ветру в случае штиля (направление при нулевой скорости или 1 м/с без направления)
	}else{
		var direction = getParam(windDir, null, null, null, replaceWind);	
		result.wind = direction + ', ' + wind + ' м/с';
	}
	
	getParam(Math.ceil(info.temp), result, 'temp', null, null, parseBalance);
	getParam(info.wx, result, 'atmo_conditions');
	getParam(info.flike, result, 'rf_temp', null, null, parseBalance);
	getParam(Math.ceil(info.presmmhg), result, 'pressure', null, null, parseBalance);
	getParam(info.cloud, result, 'cloudiness', null, null, parseBalance);
	getParam(info.dewp, result, 'point_dew', null, null, parseBalance);
	getParam(info.rhum, result, 'humidity', null, null, parseBalance);
	getParam(Math.ceil(info.vis / 1000), result, 'line_of_sight', null, null, parseBalance); // Видимость отдаётся в метрах, паереводим в км
	getParam(info.dateObject, result, 'time', null, null, parseDateISO);
	getParam(info.stationName, result, 'station');
	getParam(Math.ceil(info.dist), result, 'station_dist', null, null, parseBalance);
	
	var infoDay = data.dayForecast; // Некоторые данные есть только в прогнозе на сутки
	AnyBalance.trace('Прогноз на сутки: ' + JSON.stringify(infoDay));
	
	if(!result.atmo_conditions){ // Если в фактической погоде отсутствуют условия (такое бывает), получаем их из прогноза на сутки
		getParam(infoDay.wx, result, 'atmo_conditions');
	}
	
	getParam(infoDay.sunrise.replace(/(\d+:\d+)(:\d+)?/, '$1'), result, 'rising', null, null, parseMinutes);
	getParam(infoDay.sunset.replace(/(\d+:\d+)(:\d+)?/, '$1'), result, 'setting', null, null, parseMinutes);
	getParam(infoDay.daylen, result, 'dayLength', null, null, parseBalanceSilent);
	if(!result.dayLength && (result.setting && result.rising)){
		getParam(formatSeconds(result.setting - result.rising), result, 'dayLength', null, null, parseMinutes);
	}
    
	AnyBalance.setResult(result);
}
