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
	var baseurl = 'http://www.ents.net.ua/';
	AnyBalance.setDefaultCharset('windows-1251');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'my/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	html = AnyBalance.requestPost(baseurl + 'my/', {
		username: prefs.login,
		userpass: prefs.password,
		'sbm': 'Войти'
	}, addHeaders({Referer: baseurl + 'my/'}));
	
    html = AnyBalance.requestGet(baseurl + 'my/index', g_headers);
    
	if (!/logout/i.test(html)) {		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Текущее состояние счета:([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /ФИО:([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Тариф:([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'account', /Лицевого счет №:([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'channels', /Пакеты каналов:(?:[^>]*>){1}([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'address', /Адрес:([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}