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

function main () {
    var prefs = AnyBalance.getPreferences ();
    var baseurl = 'http://www.formulakino.ru/';
	
    checkEmpty (prefs.login, 'Введите логин');
    checkEmpty (prefs.password, 'Введите пароль');
	
	var html = AnyBalance.requestGet(baseurl + 'tm/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');

	var form = AB.getElement(html, /<form[^>]+card_login[^>]*>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа! Сайт изменен?');
	}

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'card') {
			return prefs.login;
		} else if (name == 'pin') {
			return prefs.password;
		}

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'tm/ajax/login.php', params, addHeaders({
		Accept: 'application/json, text/javascript, */*; q=0.01',
		'X-Requested-With': 'XMLHttpRequest',
		Referer: baseurl + 'tm/'}));

	var json = getJson(html);

	if (!json.status) {
		var error = json.message;
		if (error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

    var result = {success: true};
	
	html = AnyBalance.requestGet(baseurl + 'tm/cab/', g_headers);
	getParam(html, result, 'balance', /<div[^>]+class="balance"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cardnum', /<div[^>]+card-num[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /<div[^>]+card-num[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	
    AnyBalance.setResult (result);
}