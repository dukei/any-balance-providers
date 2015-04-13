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
	var baseurl = 'https://bill.link-region.ru:8443/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	try {
		var html = AnyBalance.requestGet(baseurl + 'bgbilling/webexecuter', g_headers);
	} catch(e){}
	
	if(AnyBalance.getLastStatusCode() > 400 || !html) {
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	}
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'user') 
			return prefs.login;
		else if (name == 'pswd')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'bgbilling/webexecuter', params, addHeaders({Referer: baseurl + 'bgbilling/webexecuter'}));
	
	if (!/\?action=Exit/i.test(html)) {
		var error = getParam(html, null, null, /ОШИБКА:([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Договор не найден|Неправильный пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'bgbilling/webexecuter?action=GetBalance', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Исходящий остаток на конец месяца(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'account', /Договор №([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fee', /Абонплата(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}