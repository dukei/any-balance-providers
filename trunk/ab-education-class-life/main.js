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
	var baseurl = 'https://www.class-life.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'nick')
			return prefs.login;
		else if (name == 'pass')
			return prefs.password;
		
		return value;
	});
	
	html = AnyBalance.requestPost(baseurl, params, addHeaders({Referer: baseurl}));
	
	if (!/>Выход</i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'card/stat', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, '__tariff', /Номер лицевого счета моего ребенка:([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
	
	getParam(html, result, 'balance_hot', /Баланс горячего питания:([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance_cafe', /Баланс буфетного питания:([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
	
	if(isset(result.balance_hot) && isset(result.balance_cafe))
		getParam(result.balance_hot + result.balance_cafe, result, 'balance');
	
	AnyBalance.setResult(result);
}