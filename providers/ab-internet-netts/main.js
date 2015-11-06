/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json, text/javascript, */*; q=0.01',
	'X-Requested-With': 'XMLHttpRequest',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.80 Safari/537.36',
	'Accept-Language': 'ru,en;q=0.8',
};

function createGetParams(data) {
	var params = [];
	for (var name in data) {
		params.push(encodeURIComponent(name) + '=' + encodeURIComponent(data[name]));
	}
	
	return params.join('&');
}

function main() {
	var prefs = AnyBalance.getPreferences();
	
	var baseurl = 'https://my.netts.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'account/login/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	html = AnyBalance.requestGet(baseurl + 'ws/auth/prepare-login/?login=' + encodeURIComponent(prefs.login), addHeaders({'Referer': 'https://my.netts.ru/account/login/'}));
	var data = getJson(html);

	var cnonce = Math.floor(Math.random()*1000000000);
	var digest = MD5(MD5(data.data.login + ':' + data.data.realm + ':' + prefs.password) + ':' + data.data.nonce + ':' + cnonce.toString());
	
	data = {
		login: data.data.login,
		nonce: data.data.nonce,
		cnonce: cnonce,
		digest: digest,
		status: 'regular'
	};
	
	html = AnyBalance.requestGet(baseurl + 'ws/auth/login/?' + createGetParams(data), g_headers);
	var json = getJson(html);
	
	if (json.header.error_code !== 0) {
		var error = json.header.error_message;
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    html = AnyBalance.requestGet(baseurl + 'account', g_headers);
    
	var result = {success: true};
	
	getParam(html, result, 'balance', /Лицевой счет(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /"su-name"(?:[^>]*>)([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Тарифный план(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'payment', /Размер абон. платы(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'next_payment', /Дата снятия следующей(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'account', /Логин(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	
	// getParam(html, result, 'status', /Текущий статус(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	// getParam(html, result, 'deadline', /Дата окончания расчетного периода(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
	
	AnyBalance.setResult(result);
}