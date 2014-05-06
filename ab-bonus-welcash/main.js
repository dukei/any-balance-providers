/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	'Accept': '*/*',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.66 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	if (AnyBalance.getLevel() < 6) 
		throw new AnyBalance.Error('Этот провайдер требует AnyBalance API 6+');
	
	AnyBalance.setOptions({forceCharset: 'utf-8'});
	
	var baseurl = "https://card.welcash.kiev.ua/";
	var html = AnyBalance.requestGet(baseurl + 'ua/auth', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'ua/auth', {
		card: prefs.login,
		password: prefs.password
	}, addHeaders({Referer: baseurl + 'ps/scc/login.php?SECONDARY_LOGIN=1'}));
	
	if (!/auth\/exit/.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error) throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	//html = AnyBalance.requestGet(baseurl + 'my_card');
	var result = {success: true};
	
	getParam(html, result, 'balance', />на карті([^>]*>){5}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonus', />на карті([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /"username"([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
	
	// getParam(html, result, 'cardnum', /(?:Номер карты|Номер картки):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	// getParam(html, result, 'level', /(?:Текущий уровень|Поточний рівень):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	AnyBalance.setResult(result);
}