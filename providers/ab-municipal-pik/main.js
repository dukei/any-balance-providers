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
	var baseurl = 'https://client.pik-comfort.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	html = AnyBalance.requestPost(baseurl, {
		ls: prefs.login,
		pwd: prefs.password,
		'action': 'CheckLoginPwd'
	}, addHeaders({Referer: baseurl}));
	
	if (!/exit\.png/i.test(html)) {
		var error = sumParam(html, null, null, /color:\s*red"([^>]*>){2}/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
		if (error)
			throw new AnyBalance.Error(error, null, /Номер лицевого счета введен некорректно|Неверный пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'info.html', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Сумма к оплате\s*<([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'account', />\s*(?:Номер лицевого счета|Лицевой счет)([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}