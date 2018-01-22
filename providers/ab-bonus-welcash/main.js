/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	'Accept': 			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
	'Accept-Language': 	'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'User-Agent': 		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	if (AnyBalance.getLevel() < 6) 
		throw new AnyBalance.Error('Этот провайдер требует AnyBalance API 6+');
	
	AnyBalance.setOptions({forceCharset: 'utf-8'});
	
	var baseurl = "http://my.kishenya.ua/ru";
	var html = AnyBalance.requestGet(baseurl + '/sessions/new', g_headers);
    if(!html || AnyBalance.getLastStatusCode() > 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

	var token = getParam(html, null, null, /"csrf-token"[^>]*content="([^"]*)/i);
	if(!token) {
        throw new AnyBalance.Error('Не удалось найти токен авторизации.');
    }

	html = AnyBalance.requestPost(baseurl + '/sessions ', {
		'utf8': 			  '✓',
		'authenticity_token': token,
        card_number: 		  prefs.login,
		password: 			  prefs.password,
		'button': 			  ''
	}, addHeaders({
		Referer: 		baseurl + '/sessions/new',
		'Content-Type': 'application/x-www-form-urlencoded',
		'Origin': 'http://my.kishenya.ua'
	}));
	
	if (!/bnr-bonus/.test(html)) {
		var error = getParam(html, null, null, /growl.error(?:[\s\S]*?message:\s*'([^']*))/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)  {
			throw new AnyBalance.Error(error, null, /Неправильно введены данные/i.test(error));
        }

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	
	getParam(html, result, 'balance',  /Мои бонусы(?:[\s\S]*?<p[^>]*>){2}([\s\S]*?)<\/p>/i,    replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonus',    /Мои бонусы[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i, 		   replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /<span[^>]*class='user-name'[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(prefs.login, result, 'cardnum');

	AnyBalance.setResult(result);
}