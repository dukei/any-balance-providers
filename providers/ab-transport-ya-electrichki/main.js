/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

var MAX_TRAINS_COUNTERS = 5;
var g_baseurl = 'https://rasp.yandex.ru/';

function main () {
	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.station_from, 'Введите станцию отправления!');
	checkEmpty(prefs.station_to, 'Введите станцию назначения!');

	AnyBalance.setDefaultCharset("utf-8");
	
	var html = AnyBalance.requestGet(g_baseurl, g_headers);
	
	var href = g_baseurl + 'search/suburban/' + "?fromName=" + 
	encodeURIComponent(prefs.station_from) + "&toName=" + 
	encodeURIComponent(prefs.station_to);
	
	if(/\d{3,}/.test(prefs.station_from))
		href += '&fromId=' + prefs.station_from;
	
	if(/\d{3,}/.test(prefs.station_to))
		href += '&toId=' + prefs.station_to;
	
	// var htmlFrom = AnyBalance.requestGet('https://suggests.rasp.yandex.ru/suburban?callback=jQuery&format=old&field=from&query=' + encodeURIComponent(prefs.station_from), g_headers);
	// var htmlTo = AnyBalance.requestGet('https://suggests.rasp.yandex.ru/suburban?callback=jQuery&format=old&field=to&query=' + encodeURIComponent(prefs.station_to), g_headers);
	
	
	// html = AnyBalance.requestGet('http://mobile.rasp.yandex.net/export/suburban/search/?station_from=235904&city_to=213&date=2015-12-11&tomorrow_upto=6&uuid=81b8760a06667f357ac9d52f6590dee1', g_headers);

	// return;
	html = AnyBalance.requestGet(href, addHeaders({
		'Referer': g_baseurl
	}));
	
	
	// Иногда требуется уточнить место отправления или прибытия, при совпадении названий станций, например Царицино - Весенняя
	// Оставлено для совместимости, с теми, у кого введен region в настройках
	if(/Пожалуйста, уточните(?:[^>]*>){7}\s*<a class="b-link"/.test(html)) {
		var precise_from = getParam(html, null, null, /<div class="l-precise__inner"(?:[^>]*>){2}Пожалуйста, уточните(?:[^>]*>){2}место отправления(?:[\s\S]*?<div class="b-precise-list__item[\s\S]*?<\/div){1,2}/i);
		if(precise_from) {
			AnyBalance.trace('Требуется уточнить станцию отправления...');
			if(prefs.region)
				html = performPrecision(precise_from, prefs);
			else
				throw new AnyBalance.Error('Требуется уточнить станцию отправления! Введите ID станции в настройки вместо имени!');
		}
		var precise_to = getParam(html, null, null, /<div class="l-precise__inner"(?:[^>]*>){2}Пожалуйста, уточните(?:[^>]*>){2}место прибытия(?:[\s\S]*?<div class="b-precise-list__item[\s\S]*?<\/div){1,2}/i);
		if(precise_to) {
			AnyBalance.trace('Требуется уточнить станцию прибытия...');
			if (prefs.region)
				html = performPrecision(precise_to, prefs);
			else
				throw new AnyBalance.Error('Требуется уточнить станцию прибытия! Введите ID станции в настройки вместо имени!');
		}
	}
	
    // var trainRows = getTrainTableRows(html);
	var trainRows = getElements(html, /<tr[^>]*class="[^"]*b-timetable__row b-timetable__row_sortable_yes[^>]*>/ig);
    
    if (trainRows.length < 1)
		throw new AnyBalance.Error("Не найдена информация о поездах!");
	
	var numResults = Math.min(trainRows.length, MAX_TRAINS_COUNTERS);
	
    var result = {success: true};
	
    for (var t = 0; t < numResults; t++) {
		getParam(trainRows[t], result, 'train' + t, null, replaceHtmlEntities, getTrainDepartureTime);
	}
	
	getParam(html, result, '__tariff', /Расписание электричек (из[^<]+)/i, replaceTagsAndSpaces, capitalFirstLetters);
	getParam(html, result, 'start', /Откуда(?:[^>]*>){3}[^>]*value="([^"]+)/i, null, capitalFirstLetters);
	getParam(html, result, 'finish', />Куда(?:[^>]*>){3}[^>]*value="([^"]+)/i, null, capitalFirstLetters);
	
    AnyBalance.setResult(result);
}

function performPrecision(html, prefs) {
	var accurate = getParam(html, null, null, new RegExp('<a class="b-link"[^>]*href="([^"]+)(?:[^>]*>){1,4}[^<]*?' + prefs.region, 'i'), replaceTagsAndSpaces);
	checkEmpty(accurate, 'Не удалось найти таблицу с уточнением местоположений!', true);
	return AnyBalance.requestGet(g_baseurl + accurate);
}

function getTrainDepartureTime(inputText) {
	try {
		var json = getJsonObject(inputText);

		return  getParam(json['b-timetable__row'].stabilizers[0] + '', null, null, /(\d+:\d+)/) + (json['b-timetable__row']['filter-values'].express == 'y' ? 'э' : '');
	} catch(e) {
		
	}
	
	
	// 
	
	// AnyBalance.trace(JSON.stringify(json));
	// return 'Н/Д';
	
	var re = /<td class="b-timetable__cell.+?b-timetable__cell_type_departure".+?<strong>.+?<\/strong>/;
	var cell = re.exec(inputText);
	if (cell === null) {
		return "н/д";
	} else {
		var express = isExpress(inputText) ? "э" : "";
		return /<strong>.+?<\/strong>/.exec(cell[0])[0].substr(8, 5) + express + getPlatformInfo(inputText);
	}
	
	
}

function isExpress(inputText) {
	return inputText.indexOf("b-timetable__express") >= 0;
}

function getPlatformInfo(inputText) {
	var re = /<div class="b-timetable__platform.+?<\/div>/;
	var cell = re.exec(inputText);
	if (cell === null) {
		return "";
	} else {
		return " (" + cell[0].substring(cell[0].indexOf(">") + 1, cell[0].indexOf("</")) + ")";
	}
}