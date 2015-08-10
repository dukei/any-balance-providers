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
	var baseurl = 'http://up-and-run.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер карты!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'profile', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'ajax/card_smile.php', {
		card: prefs.login,
		password: prefs.password,
		'action': 'login'
	}, addHeaders({
		Referer: baseurl + 'ajax/card_smile.php',
		'X-Requested-With':'XMLHttpRequest'
	}));
	
	var json = getJson(html);
	
	if (json.result != "success") {
		var error = '';
		for (var i = 0; i< json.errors.length; i++) {
			var curr = json.errors[i];
			error += curr.title + '\n';
		}
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный номер карты или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'profile/', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', />\s*Текущий баланс([^>]*>){5}/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}