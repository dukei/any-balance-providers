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
	var baseurl = 'http://www.besmarty.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'user/sign_in', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var loginForm = getParam(html, null, null, /<form[^>]*id="new_user"[^>]*>[^]*?<\/form>/i);
	if(!loginForm){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	}
	
	var params = createFormParams(loginForm, function(params, str, name, value) {
		if (name == 'user[email]') 
			return prefs.login;
		else if (name == 'user[password]')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'user/sign_in', params, addHeaders({Referer: baseurl + 'user/sign_in'}));
	
	if (!/sign_out/i.test(html)) {
		var error = sumParam(html, null, null, /<ul[^>]+class='error_message_list'[^>]*>([^]*?)<\/ul>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
		if (error)
			throw new AnyBalance.Error(error, null, /Учётная запись не найдена|Неверный адрес e-mail или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /<div[^>]*class='money-balance[^>]*>([^]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(prefs.login, result, '__tariff');

	AnyBalance.setResult(result);
}