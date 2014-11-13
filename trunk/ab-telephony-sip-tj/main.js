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
	var baseurl = 'http://cab.sip.tj/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'ru/auth/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'username') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});
    
	html = AnyBalance.requestPost(baseurl + 'ru/auth/', params, addHeaders({Referer: baseurl + 'ru/auth/'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<ul[^>]+class="errorlist"[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль|неверен/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var number = prefs.number || '[0-9]';
    
    var table = getParam(html, null, null, /Зарегистрированные номера NGN[\s\S]([\s\S]*?)<\/table>/i);
    
    var tr = getParam(table, null, null, new RegExp('<tr style="[\\s\\S]*?>\\s*<td>[0-9]*?' + number + '</td>[\\s\\S]*?</td>\\s*</tr>', 'i'));
    checkEmpty(tr, 'Не удалось найти ' + (prefs.number ? 'номер ' + prefs.number : 'ни одного номера!'),true);
    
	var result = {success: true};
	
	getParam(html, result, 'balance', /баланс:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'account', /Номер счета:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', /Пользователь:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', /Статус счета:(?:[^>]*>){1}([\s\S]*?)<br>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, 'number', /<td\s*>(?:[^>]){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, 'expires', /<td\s*>(?:[^>]*>){8}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
	getParam(tr, result, 'number_status', /<td\s*>(?:[^>]*>){10}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}