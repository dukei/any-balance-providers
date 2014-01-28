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
	var baseurl = 'https://billing.bks.tv:9443/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'index.cgi', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'index.cgi', {
		DOMAIN_ID:'',
		REFERRER:'https://billing.bks.tv:9443/',
		language:'russian',
		user:prefs.login,
		passwd:prefs.password,
		logined: 'Войти ',
	}, addHeaders({Referer: baseurl + 'index.cgi'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, />Ошибка(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неправильный пароль/i.test(error));
		
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var href = getParam(html, null, null, /Информация о пользователе['"][^>]*href=['"]([^'"]+)/i, null, html_entity_decode);
	if(!href)
		throw new AnyBalance.Error('Не удалось найти ссылку на информацию о пользователе.');
		
	html = AnyBalance.requestGet(href, g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Депозит:(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /ФИО:(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', /Статус:(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Тарифный план:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}