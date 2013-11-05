/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://stat.cifra1.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
		
	var html = AnyBalance.requestGet(baseurl + 'amsc/auth.jsf', g_headers);
	
	var params = createFormParams(html, function(params, str, name, value) {
		if(/type="password"/i.test(str))
			return prefs.password;
		else if(name == 'html:authForm:loginInputText')
			return prefs.login;
		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'amsc/auth.jsf', params, addHeaders({Referer: baseurl + 'amsc/auth.jsf'}));
	
	if(!/&#1074;&#1099;&#1081;&#1090;&#1080;/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if(error && /Неверный логин или пароль/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if(error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    var result = {success: true};
	
	getParam(html, result, 'balance', /&#1041;&#1072;&#1083;&#1072;&#1085;&#1089;:(?:[^>]*>){1}([^<\|]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /&#1050;&#1083;&#1080;&#1077;&#1085;&#1090;:(?:[^>]*>){1}([^<\|]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'acc_num', /&#1051;&#1080;&#1094;&#1077;&#1074;&#1086;&#1081; &#1089;&#1095;&#1105;&#1090;:(?:[^>]*>){1}([^<\|]*)/i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}