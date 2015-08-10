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
	var baseurl = 'https://my.novus.com.ua/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	if(prefs.__dbg) {
		var html = AnyBalance.requestGet(baseurl + 'info/', g_headers);
	} else {
		var html = AnyBalance.requestGet(baseurl, g_headers);
		
		var params = createFormParams(html, function(params, str, name, value) {
			if (name == 'id') 
				return prefs.login;
			else if (name == 'password')
				return prefs.password;

			return value;
		});
	
		html = AnyBalance.requestPost(baseurl, params, addHeaders({Referer: baseurl}));
	}

	if (!/Баланс/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="alert alert-block alert-danger"[^>]*>[\s\S]*?([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Вибачте, користувач з таким|Пароль не вірний/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'balance/', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'status', /Статус([^>]*>){4}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Баланс за карткою([^>]*>){4}/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}