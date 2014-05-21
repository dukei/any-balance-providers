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
	var baseurl = 'https://beeline.kz/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'ru/users/sign_in', g_headers);
	
	var form = getParam(html, null, null, /<form accept-charset="UTF-8" action="\/ru\/users\/sign_in"[\s\S]*?<\/form>/i); 
	
	if(!form) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа, сайт изменен?');
	}
	
	var params = createFormParams(form, function(params, str, name, value) {
		if (name == 'user[phone_number]') 
			return prefs.login;
		else if (name == 'user[password]')
			return prefs.password;
		
		return value;
	});
	
	try {
		html = AnyBalance.requestPost(baseurl + 'ru/users/sign_in', params, addHeaders({Referer: baseurl + 'ru/users/sign_in'}));
	} catch(e) {
		html = AnyBalance.requestGet(baseurl + 'ru/account', g_headers);
	}
	
	if (!/users\/sign_out/i.test(html)) {
		var error = getParam(html, null, null, /sms-popup"(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /пароль неверный|не зарегистрирован/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'phone', [/(\+7 \d{3} \d{3}\-\d{2}\-\d{2})/i, /ru\/account"[^>]*>(\d{10})/i], replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Ваш баланс(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'jasa', /(\d+)\s*ЖАСА/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /Текущий тариф(?:[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'sms', />\s*SMS\s*<(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'min', /Минуты звонков(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseMinutes);
	
	AnyBalance.setResult(result);
}