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
	var baseurl = 'http://club.circ-a.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');

	var token = getParam(html, null, null, /<input[^>]+value="([^"]*)"[^>]*name="YII_CSRF_TOKEN"/i);
	if (!token)
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	
	html = AnyBalance.requestPost(baseurl + 'login', {
		'YII_CSRF_TOKEN': token,
        'FrontendLoginForm[username]': prefs.login,
        'FrontendLoginForm[password]': prefs.password
	}, addHeaders({Referer: baseurl, 'X-Requested-With': 'XMLHttpRequest'}));
	
    var json = getJson(html);
    
	if (!json.status) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

    html = AnyBalance.requestGet(baseurl, g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Остаток по счету:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /class="name"(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}