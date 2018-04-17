/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': '*/*',
	'Accept-Language': 'ru',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.2; WOW64; Trident/7.0; .NET4.0C; .NET4.0E; .NET CLR 2.0.50727; .NET CLR 3.0.30729; .NET CLR 3.5.30729; Zoom 3.6.0)',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://inform.erlang.ru:89/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'inform.php?mode=full&time=' + (+new Date()) + '&version=1.0.0.4&login=' + encodeURIComponent(prefs.login) + '&password=' + hex_md5(prefs.password), g_headers);
	
	if (!/user_name_full/i.test(html)) {
		var error = getElement(html, /<[^>]+err_msg/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /парол|доступ запрещен/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Баланс(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /<span[^>]+user_name_full[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'account', /Л\/cчет(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'credit', /Кредит(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /Статус(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}