/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('UTF-8');
	
	if (!prefs.auth_email)
        	throw new AnyBalance.Error('Введите e-mail!');
	if (!prefs.auth_password)
		throw new AnyBalance.Error('Введите пароль!');
		
	html = AnyBalance.requestPost('http://bonus.avtosushi.ru/login', {
		field_email:prefs.auth_email,
		field_passwordHash:prefs.auth_password,
	}, g_headers);
	
	if (matches = html.match(/\<div id=\"balance\"\>Баланс: ([\-\d\.\,]+?|[\-\d][\s\d\.\,]+\d) авторублей/)) {
		var result = {success: true};
		/*
		if(AnyBalance.isAvailable('__tariff')) {
			result['__tariff'] = matches[1];
		}
		*/
		if(AnyBalance.isAvailable('card_bonus')) {
			result['card_bonus'] = parseFloat(matches[1]);
		}
		AnyBalance.setResult(result);
	} else {
		throw new AnyBalance.Error('Не удалось получить информацию о бонусах.');
	}
}