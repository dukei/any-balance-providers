/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Прогноз погоды с сайта http://rp5.ru
XML данные с http://rp5.ru/docs/xml/ru
*/

function parseDateTime(str) {
	AnyBalance.trace('Trying to parse date from ' + str);
	var year = new Date().getFullYear();
	str = str.replace(/(\d+\s+\S+),/g, '$1 ' + year + ', ');
	return parseDateWord(str);
}

function main() {
	AnyBalance.setDefaultCharset('utf-8');
	var prefs = AnyBalance.getPreferences();
	
	if (!prefs.city)
		throw new AnyBalance.Error("Укажите код города для показа прогноза погоды. Код можно получить на сайте http://rp5.ru. Смотрите описание провайдера для подробностей.");
	
	AnyBalance.trace("About to request \"http://rp5.ru/xml/" + prefs.city + "/00000/ru\"");
	var retry = false;
	try {
		var xml = AnyBalance.requestGet("http://rp5.ru/xml/" + prefs.city + "/00000/ru");
		retry = /404 Not Found|^\s*$/i.test(xml);
	} catch (e) {
		retry = true;
		AnyBalance.trace('Проблема получения xml: ' + e.message);
	}
	if (retry) {
		AnyBalance.trace('Похоже, rp5 заблокировал ваш IP :( Пробуем парсить HTML страницу.');
		var html = AnyBalance.requestGet('http://wap.rp5.ru/' + prefs.city + "/ru");
		parseHtml(html);
	} else {
		parseXml(xml, prefs);
	}
}

function parseHtml(html) {
	if (!/\/wap\/style.css/i.test(html)) throw new AnyBalance.Error('Не удаётся получить данные по выбранному городу. Неверный код города?');
	var result = {
		success: true
	};
	getParam(html, result, '__tariff', /<h1[^>]*>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces, html_entity_decode);
	var wasToday = false;
	html.replace(/<tr><td><b>(?:пн|вт|ср|чт|пт|сб|вс)(?:[\s\S]*?<\/tr>){5}/ig, function(tr) {
		var time = getParam(tr, null, null, /<tr><td><b>(?:пн|вт|ср|чт|пт|сб|вс),([^<]*)/i, replaceTagsAndSpaces, parseDateTime);
		var hour = new Date(time).getHours();
		if (8 < hour && hour <= 20) { //Это день
			var suffix = wasToday ? '2' : '1';
			wasToday = true;
			getParam(tr, result, 'date' + suffix, /<tr><td><b>(?:пн|вт|ср|чт|пт|сб|вс),([^<]*)/i, replaceTagsAndSpaces, parseDateTime);
			getParam(tr, result, 'cloud' + suffix, /облачность([^<]*)/i, replaceTagsAndSpaces, parseBalance);
			getParam(tr, result, 'temp' + suffix, /(?:[\s\S]*?<tr[^>]*>){4}([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
			getParam(tr, result, 'humidity' + suffix, /влажность([^<]*)/i, replaceTagsAndSpaces, parseBalance);
			getParam(tr, result, 'wind_dir' + suffix, />ветер([^,]*)/i, replaceTagsAndSpaces, html_entity_decode);
			getParam(tr, result, 'wind_vel' + suffix, />ветер(.*?)м\/сек/i, replaceTagsAndSpaces, parseBalance);
			getParam(tr, result, 'falls' + suffix, /(?:[\s\S]*?<tr[^>]*>){4}.*?,([^\(,]*)/i, replaceTagsAndSpaces, html_entity_decode);
			getParam(tr, result, 'precipitation' + suffix, /(?:[\s\S]*?<tr[^>]*>){4}.*?,(.*?)мм/i, replaceTagsAndSpaces, parseBalance);
			getParam(tr, result, 'pressure' + suffix, /давление\s*([\d.,]+)/i, replaceTagsAndSpaces, parseBalance);
		}
	});
	AnyBalance.setResult(result);
}

function getXMLParam(xml, result, name, tag, repl, decode) {
	var regExp = new RegExp('<' + tag + '>([\\s\\S]*?)</' + tag + '>', 'i');
	return getParam(xml, result, name, regExp, repl, decode);
}

function parseXml(xml, prefs) {
	if (!getXMLParam(xml, null, null, 'point_name') && !getXMLParam(xml, null, null, 'country_id'))
		throw new AnyBalance.Error("Похоже, код города " + prefs.city + " неверный.");
	
	var result = {success: true};
	
	getXMLParam(xml, result, 'point_name', 'point_name', replaceTagsAndSpaces, html_entity_decode);
	getXMLParam(xml, result, '__tariff', 'point_name', replaceTagsAndSpaces, html_entity_decode);
	
	var timesteps = sumParam(xml, null, null, /<timestep>([\s\S]*?)<\/timestep>/ig);
	var wasToday = false;
	for (var i = 0; i < timesteps.length; ++i) {
		var timestep = timesteps[i];
		var hour = getXMLParam(timestep, null, null, 'G', null, parseBalance);
		if (8 < hour && hour <= 20) { //Это день
			var suffix = wasToday ? '2' : '1';
			wasToday = true;
			getXMLParam(timestep, result, 'date' + suffix, 'datetime', replaceTagsAndSpaces, parseDateISO);
			getXMLParam(timestep, result, 'cloud' + suffix, 'cloud_cover', replaceTagsAndSpaces, parseBalance);
			getXMLParam(timestep, result, 'temp' + suffix, 'temperature', replaceTagsAndSpaces, parseBalance);
			getXMLParam(timestep, result, 'humidity' + suffix, 'humidity', replaceTagsAndSpaces, parseBalance);
			getXMLParam(timestep, result, 'pressure' + suffix, 'pressure', replaceTagsAndSpaces, parseBalance);
			getXMLParam(timestep, result, 'wind_dir' + suffix, 'wind_direction', replaceTagsAndSpaces, html_entity_decode);
			getXMLParam(timestep, result, 'wind_vel' + suffix, 'wind_velocity', replaceTagsAndSpaces, parseBalance);
			getXMLParam(timestep, result, 'precipitation' + suffix, 'precipitation', replaceTagsAndSpaces, parseBalance);
			var falls = ['без осадков', 'дождь', 'дождь со снегом', 'снег'];
			getXMLParam(timestep, result, 'falls' + suffix, 'falls', replaceTagsAndSpaces, function(str) {return falls[parseInt(str)];});
		}
	};
	AnyBalance.setResult(result);
}