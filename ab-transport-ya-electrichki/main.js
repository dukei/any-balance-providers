/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var MAX_TRAINS_COUNTERS = 3;
var g_baseurl = 'http://rasp.yandex.ru/search/suburban/';

function main () {
	
	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.station_from, 'Введите станцию отправления!');
	checkEmpty(prefs.station_to, 'Введите станцию назначения!');

	AnyBalance.setDefaultCharset("utf-8");
	
	var href = g_baseurl + "?fromName=" + 
	encodeURIComponent(prefs.station_from) + "&toName=" + 
	encodeURIComponent(prefs.station_to);
	
	if(/\d{3,}/.test(prefs.station_from)) {
		href += '&fromId=' + prefs.station_from;
	}
	
	if(/\d{3,}/.test(prefs.station_to)) {
		href += '&toId=' + prefs.station_to;
	}
	
	
    var html = AnyBalance.requestGet(href);
	
	// Иногда требуется уточнить место отправления или прибытия, при совпадении названий станций, например Царицино - Весенняя
	// Оставлено для совместимости, с теми, у кого введен region в настройках
	if(/Пожалуйста, уточните(?:[^>]*>){7}\s*<a class="b-link"/.test(html)) {
		var precise_from = getParam(html, null, null, /<div class="l-precise__inner"(?:[^>]*>){2}Пожалуйста, уточните(?:[^>]*>){2}место отправления(?:[\s\S]*?<div class="b-precise-list__item[\s\S]*?<\/div){1,2}/i);
		if(precise_from) {
			AnyBalance.trace('Требуется уточнить станцию отправления...');
			if(prefs.region) {
				html = performPrecision(precise_from, prefs);
			} else {
				throw new AnyBalance.Error('Требуется уточнить станцию отправления! Введите ID станции в настройки вместо имени!');
			}
		}
		var precise_to = getParam(html, null, null, /<div class="l-precise__inner"(?:[^>]*>){2}Пожалуйста, уточните(?:[^>]*>){2}место прибытия(?:[\s\S]*?<div class="b-precise-list__item[\s\S]*?<\/div){1,2}/i);
		if(precise_to) {
			AnyBalance.trace('Требуется уточнить станцию прибытия...');
			
			if(prefs.region) {
				html = performPrecision(precise_to, prefs);
			} else {
				throw new AnyBalance.Error('Требуется уточнить станцию прибытия! Введите ID станции в настройки вместо имени!');
				
			}
		}
	}
	
    var trainRows = getTrainTableRows(html);
    
    if (trainRows.length == 0)
		throw new AnyBalance.Error("Не найдена информация о поездах!");
	
	var numResults = Math.min(trainRows.length, MAX_TRAINS_COUNTERS);
	
    var result = {success: true};
	
    for (var t = 0; t < numResults; t++) {
        result['train' + t] = getTrainDepartureTime(trainRows[t]);
    }
	
	getParam(html, result, '__tariff', /Расписание электричек (из[^<]+)/i, replaceTagsAndSpaces, capitalFirstLenttersDecode);
	getParam(html, result, 'start', /Откуда(?:[^>]*>){3}[^>]*value="([^"]+)/i, null, capitalFirstLenttersDecode);
	getParam(html, result, 'finish', />Куда(?:[^>]*>){3}[^>]*value="([^"]+)/i, null, capitalFirstLenttersDecode);
	
    AnyBalance.setResult(result);
}

function capitalFirstLenttersDecode(str) {
	str = html_entity_decode(str+'');
	return str.charAt(0).toUpperCase() + str.slice(1);
}

function performPrecision(html, prefs) {
	var accurate = getParam(html, null, null, new RegExp('<a class="b-link"[^>]*href="([^"]+)(?:[^>]*>){1,4}[^<]*?' + prefs.region, 'i'), replaceTagsAndSpaces, html_entity_decode);
	checkEmpty(accurate, 'Не удалось найти таблицу с уточнением местоположений!', true);
	return AnyBalance.requestGet(g_baseurl + accurate);
}

/**
 * returns an array of table rows with train information
 * @param  {text} inputText html to parse
 * @return {array} array of text strings representing each table row
 */
function getTrainTableRows(inputText) {
	var result = [];
	var re = /<tr class="b-timetable__row b-timetable__row_sortable_yes i-bem".+?<\/tr>/g;
	for (var i = 0; i < MAX_TRAINS_COUNTERS; i++) {
		var row = re.exec(inputText);
		if (row === null) {
			break;
		} else {
			result[result.length] = row[0];
		}
	}
	return result;
}

function getTrainDepartureTime(inputText) {
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