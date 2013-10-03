/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://o3.ua/';
	AnyBalance.setDefaultCharset('windows-1251');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
		
	var html = AnyBalance.requestPost(baseurl + 'ru/cabinet.html', {
		redirect:'',
		logon:'1',
		login:prefs.login,
		password:prefs.password,
		logon:'1',
		chk:'frm_chk',
    }, addHeaders({Referer: baseurl + 'ru/cabinet.html'}));
	
	if(!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<h2>Личный кабинет<\/h2>\s*<div[^>]*"message"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if(error && /Неправильный логин или пароль/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if(error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    var result = {success: true};
	getParam(html, result, 'fio', /Вы вошли как([^<]*)/i, replaceTagsAndSpaces, capitalFirstLenttersDecode);
	getParam(html, result, '__tariff', /Ваш тариф[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Состояние счета\s*<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /Состояние интернет[^>]*>([^<]*)/i, replaceTagsAndSpaces, capitalFirstLenttersDecode);
	getParam(html, result, 'dogovor', /Ваш номер договора\s*<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	
	if(isAvailable(['traf_income','traf_outgoing'])) {
		html = AnyBalance.requestGet(baseurl + 'ru/statystyka-zahruzok.html', g_headers);
	
		getParam(html, result, 'traf_income', /Всего за период(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'traf_outgoing', /Всего за период(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	}
	
    AnyBalance.setResult(result);
}

/** Приводим все к единому виду вместо ИВаНов пишем Иванов */
function capitalFirstLenttersDecode(str)
{
	str = html_entity_decode(str+'');
	var wordSplit = str.toLowerCase().split(' ');
	var wordCapital = '';
	for (i = 0; i < wordSplit.length; i++) {
		wordCapital += wordSplit[i].substring(0, 1).toUpperCase() + wordSplit[i].substring(1) + ' ';
	}
	return wordCapital.replace(/^\s+|\s+$/g, '');	
}