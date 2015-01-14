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
	var baseurl = 'https://stats.fasty.net/';
	AnyBalance.setDefaultCharset('windows-1251');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'index.php', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	html = AnyBalance.requestPost(baseurl + 'index.php', {
		l: prefs.login,
		p: prefs.password,
		'act': 'Login'
	}, addHeaders({Referer: baseurl + 'index.php'}));
	
	if (!/Logout/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
    html = AnyBalance.requestGet(baseurl + 'index.php', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /баланс:(?:[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalanceRK);
	getParam(html, result, 'disconnect', /Отключение при балансе:(?:[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /Статус<(?:[^>]*>){5}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', /Фамилия(?:[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Tariff(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'uin', /UIN-номер(?:[^>]*>){6}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}

function parseBalanceRK(_text){
    var text = _text.replace(/\s+/g, '');
    var rub = getParam(text, null, null, /(-?\d[\d\.,]*)\s*грн\./i, replaceFloat, parseFloat) || 0;
    var kop = getParam(text, null, null, /(-?\d[\d\.,]*)\s*коп\./i, replaceFloat, parseFloat) || 0;
    var val = rub+kop/100;
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + _text);
    return val;
}