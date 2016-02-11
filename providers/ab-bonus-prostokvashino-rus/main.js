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
	var baseurl = 'http://prostokvashino.ru/';
	var replaceFloat = [/\s+/g, '', /,/g, '', /(\d)\-(\d)/g, '$1.$2'];
	function parseBalance(text){
		var _text = text.replace(/\s+/g, '');
		var val = getParam(_text, null, null, /(-?\d[\d\.,\-]*)/, replaceFloat, parseFloat);
		AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
		
		return val;
		}
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	var loginForm = getParam(html, null, null, /<form[^>]+action="\/login"[^>]*>[^]+?<\/form>/i);
	if(!loginForm)
		throw new AnyBalance.Error('Не найдена форма входа. Сайт изменен?');

	var params = createFormParams(loginForm, function(params, str, name, value) {
		if (name == 'app__logon[login]') 
			return prefs.login;
		else if (name == 'app__logon[password]')
			return prefs.password;

		return value;
	});

    html = AnyBalance.requestPost(baseurl + 'login', params, addHeaders({Referer: baseurl })); 
	html = AnyBalance.requestGet(baseurl, g_headers);
	
	if (!/\logout/i.test(html)) {
		var error = getParam(html, null, null,  /<div[^>]+class=['"]login__form-msg-error['"][^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error){
			throw new AnyBalance.Error('Логин или Пароль не правильные');
		}
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	} 
	
	html = AnyBalance.requestGet(baseurl + 'user/account', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /js_profile_balance[\s\S]+?([^><]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance_rur', /lk-million-main__ball[\s\S]+?([&\d]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /profile_avatar-name[\s\S]+?([^><]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}