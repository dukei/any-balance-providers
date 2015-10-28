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
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');	
	
	var host = prefs.type || 'tv';
	var baseurl = 'https://itce.ru/' + host + '/billing/';
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var html = AnyBalance.requestPost(baseurl + '?page=billing', {
		'host': host + '.itce.ru',
		'options[page]':'billing',
		'module':'inetBilling',
		'account':prefs.login,
		'password':prefs.password,
		'undefined':'Вход',
    }, addHeaders({Referer: baseurl + '?page=billing', 'X-Requested-With':'XMLHttpRequest'}));
	
	if(!/>выход<|^ok$/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestPost(baseurl + 'core.php', {
		'host': host + '.itce.ru',
		'options[page]':'billing',
		'module':'inetBilling',
    }, addHeaders({Referer: baseurl + 'core.php'}));
	
    var result = {success: true};
	getParam(html, result, 'balance', /Ваш баланс:[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /<h2>([^<.]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'agreement', /Договор:([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	
    AnyBalance.setResult(result);
}