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

function main(){
	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.track_id, 'Введите номер почтового отправления!');
	
	var baseurl = "https://gdeposylka.ru/";
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'form', {
		'tracking_form[tracking_number]': prefs.track_id,
		'tracking_form[track]': '',	
	}, addHeaders({Referer: baseurl + 'form'}));
	
	if (!/Посылка в пути/i.test(html)) {
		var error = getParam(html, null, null, [/<div class="errorBox"[^>]*>([\s\S]*?)<\/div>/i, /<span class="error"[^>]*>([\s\S]*?)<\/span>/i], replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти данные по отправлению ' + prefs.track_id);
	}
	
	var result = {success: true};
	
	getParam(html, result, '__tariff', /<h2>\s*<strong>([^<]+)/i, replaceTagsAndSpaces);
	getParam(html, result, ['days' , '__tariff'], /В пути(?:[^>]*>){2}\s*(\d+)\s*д/i, replaceTagsAndSpaces, parseBalance);
	
	var table = getElement(html, /<ul\s+class="checkpoints">/i);
	if(!table)
		throw new AnyBalance.Error("Не удалось найти статус посылки, возможно, из-за изменений на сайте");
	
	var checkpoints = getElements(table, /<li[^>]*>/ig);
	
	AnyBalance.trace('checkpoints ' + checkpoints.length);
	
	if(AnyBalance.isAvailable('fulltext')) {
		if(checkpoints.length == 0) {
			result.fulltext = 'Информации о местоположении посылки пока нет.';
		} else {
			result.fulltext = '';
			
			for(var i = 0; i < checkpoints.length; i++) {
				var date = getParam(checkpoints[i], null, null, /<time[^>]*datetime="([^"]+)/i, replaceTagsAndSpaces, parseDateISO);
				var status = getParam(checkpoints[i], null, null, /"checkpoint-status"(?:[^>]*>)([^<]+)/i, replaceTagsAndSpaces);
				var geo = getParam(checkpoints[i], null, null, /class="text-muted"[^>]*>([\s\S]*?)<\/div/i, replaceTagsAndSpaces);
				
				if(i == 0) {
					getParam(status, result, 'status');
					getParam(date, result, 'date');
					getParam(geo, result, 'geo');
				}
				
				result.fulltext += '<b>' + status + ' (' + geo + ')</b><br/>' + '<small>' + getDateString(date) + '</small><br/><br/>';
			}
			
			result.fulltext = result.fulltext.replace(/<br\/><br\/>$/i, '');
		}
	}
	
	// var days = getParam(html, null, null, /"parcelin-days"(?:[^>]*>){1}([^<\|]*)/i, replaceTagsAndSpaces, parseBalance);
	
	// var table = getParam(html, null, null, /class="parcelin-table"([\s\S]*?)<\/table>/i);
	// if(!table)
		// throw new AnyBalance.Error("Не удалось найти статус посылки, возможно, из-за изменений на сайте");
	
	// getParam(table, result, 'geo', /class="city"[^>]*>([\s\S]*?)<\/div>/i, [/Неизвестное местоположение/i, '', replaceTagsAndSpaces]);
	
	// var status = getParam(table, null, null, /parcel-info_mod"[^>]*>([^<]*)/i, replaceTagsAndSpaces);
	// var date = getParam(table, null, null, /parcelin-received-date"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseDateW);
	
	// getParam(status, result, 'status');
	// getParam(date, result, 'date');
	// getParam(days, result, 'days');
	
	// // Фисксим <b>undefined</b><br/>\n<small>NaN/NaN/NaN NaN:NaN</small>: в пути 0 дн.
	// if(AnyBalance.isAvailable('fulltext')){
		// if(status && date && (days > 0)) {
			// result.fulltext = '<b>' + status + '</b><br/>\n' + '<small>' + getDateString(date) + '</small> в пути ' + days + ' дн.';
		// } else {
			// result.fulltext = 'Информация недоступна.'
		// }
	// }
	
	AnyBalance.setResult(result);
}

function getDateString(dt) {
    if (typeof dt != 'object') 
		dt = new Date(dt);
    return numSize(dt.getDate(), 2) + '/' + numSize(dt.getMonth() + 1, 2) + '/' + dt.getFullYear() + " " + numSize(dt.getHours(), 2) + ':' + numSize(dt.getMinutes(), 2);
}

function numSize(num, size) {
	var str = num + '';
	if (str.length < size) {
		for (var i = str.length; i < size; ++i) {
			str = '0' + str;
		}
	}
	return str;
}


