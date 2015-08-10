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
	//http://мурмандоставка.рф/
	var baseurl = 'http://xn--80aaahi2bjaklrrng.xn--p1ai/cardsystem/';
	AnyBalance.setDefaultCharset('windows-1251');
	
	checkEmpty(prefs.login, 'Введите номер карты!');
	
	var html = AnyBalance.requestPost(baseurl, {
		view: 'login',
		username: prefs.login
	}, addHeaders({Referer: baseurl}));
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<span[^>]+class="error"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Карточка не найдена/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Ваш баланс:([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /Номер карты:([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'till', /действия карты:([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDate);
	
	AnyBalance.setResult(result);
}