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
	var baseurl = 'https://iscs.astragsm.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login.aspx', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'txtNumber') 
			return prefs.login;
		else if (name == 'txtPassword')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'login.aspx', params, addHeaders({Referer: baseurl + 'login.aspx'}));
	
	if (!/signout\.aspx/i.test(html)) {
		var error = sumParam(html, null, null, /class="error">([\s\S]*?)<\//ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
		if (error)
			throw new AnyBalance.Error(error, null, /неверный номер абонента/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /баланс:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'phone', /Номер телефона:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', /Пользователь:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
	html = AnyBalance.requestGet(baseurl + 'status.aspx', g_headers);
	
	getParam(html, result, '__tariff', /Тарифный план:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}