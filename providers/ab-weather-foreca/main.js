/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://old.foreca.com/';
	AnyBalance.setDefaultCharset('utf-8');

	/* Проверяем не забыл ли пользователь ввести данные. Страну вводить не обязательно, она только уточняет поиск, поэтому её не проверяем */

	checkEmpty(prefs.city_name, 'Введите название города!');

	/* Проверяем доступность ресурса */

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже');
	}

	// в нормальном виде cookie не применяются, если '%3D' => '=' и '%26' => '&'
	AnyBalance.setCookie('old.foreca.com', 'st2', 'lang%3Dru%26units%3Dmetricmmhg%26tf%3D24h%26ml%3D%26u%3DRYU2ZSSXXU4A', {path: '/'});

	/* Проверяем доступность прогноза для указанного города */

	html = AnyBalance.requestPost(baseurl, {
		q: prefs.city_name,
		do_search: 'Find place',
		country_id: 'ru'
	}, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при определении города! Попробуйте еще раз позже');
	}

	// проверяем есть такой город или нет
	if(/<h1 class="entry-title">/i.test(html)){
		AnyBalance.trace('Похоже, мы уже на странице прогноза'); // Если поиск не предлагает выбора городов, то сразу отправляет на страницу прогноза
	}else{
		var expr = '<dd>[\\s\\S]*?<a[^>]*?href\\s*?=\\s*?"([\\s\\S]*?)"[\\s\\S]*?' + prefs.city_name + '[\\s\\S]*?<\/a[^>]*?>';
	    var rx = new RegExp(expr, 'i');
		var dl = getElement(html, /<dl[^>]+class="in">/i);
		var dds = getElements(dl, /<dd[^>]*>/ig);
		if(dds && dds.length > 0){
			var cityHref;
			for(var i=0; i<dds.length; i++){
				var dd = dds[i];
				var city = getParam(dd, null, null, /<a[^>]*?href\s*?=\s*?"[\s\S]*?"[^>]*>([\s\S]*?)<\/a[^>]*?>/i, replaceTagsAndSpaces);
				var country = getParam(dd, null, null, /<a[^>]*?href\s*?=\s*?"[\s\S]*"[^>]*>([\s\S]*?)<\/a[^>]*?>/i, replaceTagsAndSpaces);
				AnyBalance.trace('Найден город: ' + city + ' (' + country + ')');
				if(!prefs.country_name){
					if(city == prefs.city_name){
						AnyBalance.trace('Страна не указана в настройках. Выбираем первый соответствующий названию город: ' + city + ' (' + country + ')');
				        cityHref = getParam(dd, null, null, rx);
				    	break;
				    }else{
						continue;
					}
				}else{
					if(dd.includes(prefs.country_name) && city == prefs.city_name){
					    AnyBalance.trace('Страна указана в настройках (' + prefs.country_name + '). Выбираем первый соответствующий названию город: ' + city);
				        cityHref = getParam(dd, null, null, rx);
						break;
					}else{
                        continue;
					}
				}
			}
			if(!cityHref){
				var city = getParam(dds[0], null, null, /<a[^>]*?href\s*?=\s*?"[\s\S]*?"><strong[^>]*>([\s\S]*?)<\/strong><\/a[^>]*?>/i, replaceTagsAndSpaces);
				var country = getParam(dds[0], null, null, /<a[^>]*?href\s*?=\s*?"[\s\S]*"[^>]*>([\s\S]*?)<\/a[^>]*?>/i, replaceTagsAndSpaces);
				AnyBalance.trace('Точных соответствий не найдено. Выбираем первый город из списка предложенных: ' + city + ' (' + country + ')');
				cityHref = getParam(dds[0], null, null, rx);
			}
		}
		
	    if (!cityHref) {
	    	var error = getParam(html, null, null, /Результаты\s*?выбора<\/h1[\s\S]*?class\s*?=\s*?['"]clearb[\s\S]*?<p[^>]*?>([\s\S]*?)<\/p[^>]*?>/i, replaceTagsAndSpaces);
	    	if (error) {
	    		throw new AnyBalance.Error(error, null, /Ваш выбор остался без результата/i.test(error));
			} else {
	    		// если не смогли определить ошибку, то показываем дефолтное сообщение
	    		AnyBalance.trace(html);
	    		throw new AnyBalance.Error('Не удалось определить город. Сайт изменен?');
	    	}
	    }

	    /* Получаем данные */

	    //переходим на страницу с прогнозом
	    var html = AnyBalance.requestGet(baseurl + cityHref.substring(1), g_headers);

	    if(!html || AnyBalance.getLastStatusCode() > 400) {
	    	AnyBalance.trace(html);
	    	throw new AnyBalance.Error('Ошибка при получении прогноза! Попробуйте позже.');
	    }
	}

	var result = {success: true};
    
	var city = getElementsByClassName(html, 'entry-title', replaceTagsAndSpaces);
	if (city.length) {
		result.__tariff = city[0];
	} else if (!city.length && prefs.city_name) {
		result.__tariff = prefs.city_name;
	} else {
		result.__tariff = null;
	}

	var table = getElementsByClassName(html, 'table t_cond');
	if(!table.length) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить прогноз. Сайт изменен?');
	} else {
		table = table[0];
	}
    
	var temp = getElementsByClassName(table, 'txt-xxlarge', replaceTagsAndSpaces, parseBalance);
	if (temp.length) {
		result.temp = temp[0];
	} else {
		result.temp = null;
	}

	var wind = getParam(table, null, null, /Фактическая\s*?погода[\s\S]*?<br\s*?\/>\s*?(?:<img[^>]*?wind[\s\S]*?)?<strong[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	var replaceWind = ['N', 'С', 'NE', 'СВ', 'S', 'Ю', 'SE', 'ЮВ', 'W', 'З', 'NW', 'СВ', 'E', 'В', 'SW', 'ЮЗ'];
	var windDir = getParam(table, null, null, /Фактическая\s*?погода[\s\S]*?<br\s*?\/>\s*?<img[^>]*?wind[\s\S]*?alt\s*?=\s*['"]([\s\S]*?)['"][^>]*?>/i, replaceWind);
	
	if (!windDir) {
		var dir = getParam(html, null, null, /mgdata\s*?=[\s\S]*?wd:([\s\S]*?)\,/i, replaceTagsAndSpaces);
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
			windDir = undefined;
		}
	}
	
	var direction = getParam(windDir, null, null, null, replaceWind);
	result.wind = (direction || 'Ш') + ', ' + (wind || 0) + ' м/с'; // Форека не отдаёт никаких данных по ветру в случае штиля
	
	getParam(table, result, 'atmo_conditions', /Фактическая\s*?погода\s*?<img\s*?src=[\s\S]*?alt=[\s\S]*?div[^>]+class[^>]*>([\s\S]*?)<br\s*?\/>\s*?Ощущается/i, replaceTagsAndSpaces);
	if(!result.atmo_conditions){
		result.atmo_conditions = 'Нет данных';
	}
	getParam(table, result, 'rf_temp', /Ощущается\s*?как[\s\S]*?<strong[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'pressure', /Барометр[\s\S]*?<strong[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'point_dew', /Точка\s*?росы[\s\S]*?<strong[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'humidity', /От.\s*?влажность[\s\S]*?<strong[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'line_of_sight', /Видимость[\s\S]*?<strong[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'rising', /Восход\s*?солнца[\s\S]*?<strong[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces, parseMinutes);
	getParam(table, result, 'setting', /Закат\s*?солнца[\s\S]*?<strong[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces, parseMinutes);
	getParam(table, result, 'dayLength', /Долгота\s*?дня[\s\S]*?<strong[^>]*?>([\s\S]*?)</i, [/(\d+)[\s\S]*?(\d+)/, '$1:$2', replaceTagsAndSpaces], parseMinutes);
	if(!result.dayLength && (result.setting && result.rising)){
		getParam(formatSeconds(result.setting - result.rising), result, 'dayLength', null, null, parseMinutes);
	}
	getParam(table, result, 'station', /Станция\s*?наблюдений[\s\S]*?value="\d+"\s*?selected[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces);
    
	getParam(table, result, 'time', /В\s*?<strong[^>]*?>([\s\S]*?)<\/strong><br\s*?\/>/i, [/(\d{2})\/(\d{2})\s+(\d{2}:\d{2})/, '$1/$2/' + new Date().getFullYear() + ' $3',
	replaceTagsAndSpaces], parseDate);
	
	AnyBalance.setResult(result);
}

function formatSeconds(val) {
    var date = new Date(1970,0,1);
    date.setSeconds(val);
    return date.toTimeString().replace(/.*(\d{2}):(\d{2}:\d{2}).*/, "$2");
}
