var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.korablik.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'auth/login', g_headers);
	
	if(AnyBalance.getLastStatusCode() > 400) {
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	}
	var sitekey = getParam(html, /data-sitekey="([^"]*)/i, replaceHtmlEntities);
	if(sitekey){
		AnyBalance.trace('Потребовалась рекапча');
		var code = solveRecaptcha('Пожалуйста, докажите, что вы не робот', baseurl, sitekey);
	}
	
	html = AnyBalance.requestPost(baseurl + 'auth/login', {
        login: prefs.login,
        pwd: prefs.password,
		'g-recaptcha-response': code,
		'submit': '',
    }, g_headers);
	
	if(!/Выход/i.test(html)) {
		var error = getParam(html, null, null, /<p[^>]+error[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неправильный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};
	
	html = AnyBalance.requestGet(baseurl + 'detskaya/mycards', addHeaders({Referer: baseurl + 'detskaya/profile'}));
	var cardsBlock = getElement(html, /<div[^>]+class="jcarousel"[^>]*>/i);
	var cardBlocks = getElements(cardsBlock, /<li[^>]+row[^>]*>/ig);
	AnyBalance.trace('Найдено ' + cardBlocks.length + ' карт');

	if(!cardBlocks.length){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти ни одной карты. Сайт изменен?');
	}
	
	for(var i = 0; i < cardBlocks.length; i++) {
		var cb = cardBlocks[i];
		getParam(cb, result, (i > 0) ? 'cardnum' + i : 'cardnum', /№\s*([^<]*)/i, replaceTagsAndSpaces);
		getParam(cb, result, (i > 0) ? 'cardbalance' + i : 'cardbalance', /Баланс:([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	}
	
	getParam(html, result, 'status_balance', /<span[^>]+statSum[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /<span[^>]+statName[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	
    AnyBalance.setResult(result);
}