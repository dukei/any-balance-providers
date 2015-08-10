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

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://myparcels.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	
	html = AnyBalance.requestPost(baseurl + 'actions.php', {
		email: prefs.login,
		passwd: prefs.password,
		'do': 'login'
	}, addHeaders({Referer: baseurl}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /class="error"[^>]*>([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var parcel = getParam(html, null, null, new RegExp('<div id="' + (prefs.track || '[^"]{8,}') + '"(?:[^>]*>){30,68}[^>]*в архив">\\s*</a>\\s*</div>', 'i'));
	if(!parcel) {
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.track ? 'посылку с номером ' + prefs.track : 'ни одной посылки!'));
	}
	
	var result = {success: true};
	
	getParam(parcel, result, '__tariff', /<div id="([^"]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(parcel, result, 'name', /<span title="([^"]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(parcel, result, 'days', /Время в пути:([\s\d]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(parcel, result, 'status', /<b title="([^"]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(parcel, result, 'date', /"infoRow3">([^<(]+)/i, replaceTagsAndSpaces, parseDate);
	
	AnyBalance.setResult(result);
}