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
	var baseurl = 'http://fcenter.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'profile/login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'profile/doLogin', {
		userName: prefs.login,
		userPass: prefs.password,
		autoLogin: 'on'
	}, addHeaders({Referer: baseurl + 'profile/login'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="box-sec ajax-error"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неправильно введен логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl + 'profile/show', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /(Баллов:\s+[\d.]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /Баллов:(?:[\s\S](?!<div))*((?:[\s\S](?!<br>))+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'type', /Скидка:([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', /Состояние:([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'cardnum', /Карта покупателя №([^<]+)/i, replaceTagsAndSpaces, parseBalance);

	if(isAvailable('history')){
		html = AnyBalance.requestGet(baseurl + 'profile/points', g_headers);
		sumParam(html, result, 'history', /<td class="profile-status">(?:[\s\S](?!card-points))+[^>]+>\s*[\d.]+\s*<\/td>/ig, replaceTagsAndSpaces, null, null, aggregateHistory);
	}

	AnyBalance.setResult(result);
}

function aggregateHistory(rows){
	for(var i = 0, toi = rows.length; i < toi; i++)
		rows[i] = rows[i].replace(/(\s[\d.]+)$/, ' доступно$1');
	return rows.join('<br />');
}