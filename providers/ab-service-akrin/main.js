/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.109 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.akrin.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите фамилию!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'BPSWeb/login/', g_headers);
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'lastName') 
			return prefs.login;
		else if (name == 'passport')
			return prefs.series + prefs.number;
		else if (name == 'password')
			return prefs.password;
			
		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'BPSWeb/login.form', params, addHeaders({Referer: baseurl + 'BPSWeb/login/'}));
	
	if (!/personlayout.exit/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /(не зарегистрирован в системе|неверный пароль)/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'fio', /Вы вошли как([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Баланс:([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}