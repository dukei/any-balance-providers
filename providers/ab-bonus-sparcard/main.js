/**
Провайдер AnyBalance
*/

var g_headers = {
	'Accept':'application/json',
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
		
	response = AnyBalance.requestPost('https://api-sparmv.loymax.tech/token', {
		'grant_type':'password',
		'username':prefs.auth_cnumber,
		'password':prefs.auth_password
	}, g_headers);

	try {
		token = JSON.parse(response);
	} catch (ex) {
		throw new AnyBalance.Error("Сервер вернул ошибочные данные: " + ex.message);
	}
	
	if (token.error_description) {
		throw new AnyBalance.Error(token.error_description);
	} else if (!token.access_token) {
		throw new AnyBalance.Error('Не удалось авторизоваться.');
	}

	g_headers['Authorization'] = 'Bearer ' + token.access_token;

	response = AnyBalance.requestGet('https://api-sparmv.loymax.tech/api/user', g_headers);

	try {
		user = JSON.parse(response);
	} catch (ex) {
		throw new AnyBalance.Error("Сервер вернул ошибочные данные: " + ex.message);
	}

	var result = {success: true};

	if (user.data.cardShortInfo) {
		if(AnyBalance.isAvailable('__tariff')) {
			result['__tariff'] = user.data.cardShortInfo.id;
		}
		if(AnyBalance.isAvailable('card_bonus')) {
			result['card_bonus'] = parseFloat(user.data.cardShortInfo.balance);
		}
		AnyBalance.setResult(result);
	} else {
		throw new AnyBalance.Error('Не удалось получить информацию о бонусах.');
	}
}
