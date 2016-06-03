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
	
	if (!prefs.auth_cnumber)
        	throw new AnyBalance.Error('Введите номер карты!');
	if (!prefs.auth_password)
		throw new AnyBalance.Error('Введите пароль!');
		
	html = AnyBalance.requestPost('https://card.spar-nn.ru/site/login', {
		'LoginForm[redirect]':'',
		'LoginForm[login]':prefs.auth_cnumber,
		'LoginForm[password]':prefs.auth_password,
		'LoginForm[rememberMe]':'0',
		'yt0':'Вход'
	}, g_headers);
	
	if (matches = html.match(/\<div class=\"errorMessage\"[^\>]*\>([^\<]+)\<\/div\>/)) {
		throw new AnyBalance.Error(matches[1]);
	}

	html = AnyBalance.requestGet('https://card.spar-nn.ru/user', g_headers);

	var result = {success: false};

	if (matches = html.match(/\<span class=\"lkuicard\"\>([\d\s]+)\<\/span\>/)) {
		if(AnyBalance.isAvailable('__tariff')) {
			result['__tariff'] = matches[1];
		}
	}

	if (matches = html.match(/\<span class=\"lkuibalance\"\>\s*(\-?[\s\d\.]*?\d)[^\d\<]*\<\/span\>/)) {
		result['success'] = true;
		if(AnyBalance.isAvailable('card_bonus')) {
			result['card_bonus'] = parseFloat(matches[1].replace(' ', ''));
		}
		AnyBalance.setResult(result);
	} else {
		throw new AnyBalance.Error('Не удалось получить информацию о бонусах.');
	}
}
