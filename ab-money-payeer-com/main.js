/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'application/json, text/javascript, */*; q=0.01',
	'Accept-Language':'ru,en;q=0.8',
	'Connection':'keep-alive',
	'Origin': 'https://payeer.com',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.114 Safari/537.36',
	'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://payeer.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	AnyBalance.setCookie('payeer.com', 'BITRIX_SM_LOGIN', prefs.login);
	AnyBalance.setCookie('payeer.com', 'BITRIX_SM_SOUND_LOGIN_PLAYED', 'Y');
	AnyBalance.setCookie('payeer.com', 'BITRIX_SM_SALE_UID', '0');
	
	//var stT = mdDONWKS();
	dateServer = getParam(html, null, null, /var\s+dateServer\s*=\s*'([^']+)/i);
	
	if(!dateServer) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти токен авторизации. Сайт изменен?');
	}
	
	var hash = md5(String(/*mdDONWKS()-stT*/13), true);
	
	html = AnyBalance.requestPost(baseurl + 'ajax/index.php', {
		'cmd':'auth_step1',
		'backurl':'',
		'CHPM':hash,
		'email':prefs.login,
		'password':prefs.password,
		'Login':'Войти'
	}, addHeaders({Referer: baseurl, 'X-Requested-With':'XMLHttpRequest'}));
	
	try {
		var json = getJson(html);
		if(json.location)
			html = AnyBalance.requestGet(baseurl + json.location, g_headers);	
	} catch(e) {
	}
	
	if (!/logout=yes/i.test(html)) {
		var error = getParam(html, null, null, /"form_error"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль|Пользователь не найден/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};
	
	getParam(html, result, 'acc_num', />\s*Номер счета(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'rub', />\s*RUB(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'usd', />\s*USD(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'eur', />\s*EUR(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}