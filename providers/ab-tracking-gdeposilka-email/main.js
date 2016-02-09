/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.97 Safari/537.36',
};
var baseurl = 'https://gdeposylka.ru';

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl+'/auth/login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + '/auth/check', {
		_username: prefs.login,
		_password: prefs.password,
	}, AB.addHeaders({
		Referer: baseurl + '/auth/login'
	}));
	
	if (!/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /<div[^>]+class="alert alert-danger"[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неправильный адрес электропочты или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl+'/tracks', g_headers);

	var result = {success: true};

	var trackingTable = AB.getParam(html, null, null, /<div[^>]+class="trackings-list"[^>]*>([\s\S]*?)<footer[^>]*>/i);
	if(!trackingTable)
		throw new AnyBalance.Error("Не удалось найти таблицу с трек-номерами. Сайт изменён?");

	var tracks = getElements(trackingTable, /<div[^>]+class="tracking-number"[^>]*>/ig);
	if(tracks.length == 0)
		throw new AnyBalance.Error("Не удалось найти почтовые отправления.");
	AnyBalance.trace("Найдено посылок: " + tracks.length);

	if(prefs.track_id) {
		var regExp = new RegExp('<a[^>]+href="([\\s\\S]*?' + prefs.track_id + ')"', 'i');
		for(var i=0; i<tracks.length; i++) {
			var href = AB.getParam(tracks[i], null, null, regExp);

			if(href) {
				getInfo(result, href);
				break;
			}
		}

		if(!href)
			AnyBalance.trace("Не нашли посылку с номером " + prefs.track_id + ' пытаемся получить информацию по первому номеру...');
	}

	if(!AnyBalance.isSetResultCalled()) {
		var href = AB.getParam(tracks[0], null, null, /<a[^>]+href="([\s\S]*?)"/i);
		if(!href)
			throw new AnyBalance.Error("Не удалось найти ссылку на почтовое отправление. Сайт изменён?");

		getInfo(result, href);
	}

}


function getInfo(result, href) {
	var html = AnyBalance.requestGet(baseurl+href, g_headers);
	AB.getParam(html, result, '__tariff', /<h2>\s*<strong>([^<]+)/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, ['days' , '__tariff'], /В пути(?:[^>]*>){2}\s*(\d+)\s*д/i, AB.replaceTagsAndSpaces, AB.parseBalance);

	var table = getElement(html, /<ul\s+class="checkpoints">/i);
	if(!table)
		throw new AnyBalance.Error("Не удалось найти статус посылки, возможно, из-за изменений на сайте.");

	var checkpoints = getElements(table, /<li[^>]*>/ig);

	AnyBalance.trace('checkpoints ' + checkpoints.length);

	if(AnyBalance.isAvailable('fulltext')) {
		if(checkpoints.length == 0) {
			result.fulltext = 'Информации о местоположении посылки пока нет.';
		} else {
			result.fulltext = '';

			for(var i = 0; i < checkpoints.length; i++) {
				var date = getParam(checkpoints[i], null, null, /<time[^>]*datetime="([^"]+)/i, AB.replaceTagsAndSpaces, AB.parseDateISO);
				var status = getParam(checkpoints[i], null, null, /"checkpoint-status"(?:[^>]*>)([^<]+)/i, AB.replaceTagsAndSpaces);
				var geo = getParam(checkpoints[i], null, null, /class="text-muted"[^>]*>([\s\S]*?)<\/div/i, AB.replaceTagsAndSpaces);

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