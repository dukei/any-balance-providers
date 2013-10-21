/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Статус почтового отправления с сайта moyaposylka.ru

Сайт оператора: http://moyaposylka.ru
Личный кабинет: http://moyaposylka.ru
*/
function numSize(num, size) {
	var str = num + '';
	if (str.length < size) {
		for (var i = str.length; i < size; ++i) {
			str = '0' + str;
		}
	}
	return str;
}

function getDateString(dt) {
	if (typeof dt != 'object') dt = new Date(dt);
	return numSize(dt.getDate(), 2) + '/' + numSize(dt.getMonth() + 1, 2) + '/' + dt.getFullYear() + " " + numSize(dt.getHours(), 2) + ':' + numSize(dt.getMinutes(), 2);
}

var g_headers = {
	Accept: '*/*',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	Connection: 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.97 Safari/537.11',
};

function getMyPosylkaResult(prefs) {
	AnyBalance.trace('Connecting to moyaposylka...');
	var id = prefs.track_id; //Код отправления, введенный пользователем
	var dest = prefs.track_dest; //Страна назначения
	var baseurl = "https://moyaposylka.ru";
	var html = AnyBalance.requestGet(baseurl, g_headers);
	html = AnyBalance.requestPost(baseurl + '/quick-check/', {
		'number': prefs.track_id,
		'destinationCountry': prefs.track_dest || 'RU',
	}, addHeaders({
		Origin: baseurl,
		Referer: baseurl + '/',
		'X-Requested-With': 'XMLHttpRequest'
	}));
	var error = getParam(html, null, null, /<div[^>]*class="quick-check-error"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	if (error) throw new AnyBalance.Error(error);
	
	var result = {success: true};
	
	var tr = getParam(html, null, null, /<tr[^>]*>(\s*<td[^>]+class="tracker-date[\s\S]*?)<\/tr>/i);
	if (!tr) {
		error = getParam(html, null, null, /<ul[^>]+class="form-errors"[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error) AnyBalance.trace('Случилась ошибка, пробуем закешеный результат: ' + error);
	}
	if (!tr) {
		html = AnyBalance.requestGet(baseurl + '/' + prefs.track_id, g_headers);
		tr = getParam(html, null, null, /<tr[^>]*>(\s*<td[^>]+class="tracker-date[\s\S]*?)<\/tr>/i);
		if (!tr) {
			if (error) throw new AnyBalance.Error(error);
			throw new AnyBalance.Error('Информация об отправлении не найдена!');
		}
	}
	getParam(html, result, 'trackid', /<h2[^>]*>([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'days', /Дней в пути\s*<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'weight', /Вес посылки:?\s*<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(tr, result, 'date', /(?:<td[^>]*>[\s\S]*?){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
	getParam(tr, result, 'address', /(?:<td[^>]*>[\s\S]*?){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, 'status', /(?:<td[^>]*>[\s\S]*?){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	
	if (AnyBalance.isAvailable('fulltext')) {
		var date = getParam(tr, null, null, /(?:<td[^>]*>[\s\S]*?){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
		var address = getParam(tr, null, null, /(?:<td[^>]*>[\s\S]*?){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
		var status = getParam(tr, null, null, /(?:<td[^>]*>[\s\S]*?){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
		var days = getParam(html, null, null, /Дней в пути\s*<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
		result.fulltext = '<b>' + status + '</b><br/>\n' + '<small>' + getDateString(date) + '</small>: ' + address + '<br/>\n' + 'в пути ' + days + ' дн.';
	}
	return result;
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var result = getMyPosylkaResult(prefs);
	AnyBalance.setResult(result);
}

function createCountries(baseurl, result) {
	var html = AnyBalance.requestGet(baseurl);
	var ids = [],
	names = [];
	html.replace(/<option[^>]+value="([^"]*)[^>]*>([^<]*)<\/option>/ig, function(str, countryid, countryname) {
		ids[ids.length] = countryid;
		names[names.length] = countryname;
		return str;
	});
	result.entries = ids.join('|');
	result.entryValues = names.join('|');
}