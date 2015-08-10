/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'Origin':'https://www.iqcard.ru',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.iqcard.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'iqc/pages/public/login.html', g_headers);
	
	try {
		html = AnyBalance.requestPost(baseurl + 'iqc/login', {
			username: prefs.login,
			password: prefs.password,
		}, addHeaders({Referer: baseurl + 'iqc/pages/public/login.html'}));
	} catch(e) {}
	
	html = AnyBalance.requestGet(baseurl + 'iqc/pages/cabinet/cards.html', g_headers);
	
	if (!/j_spring_security_logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var cardNum = prefs.lastdigits || '\\d{4}';
	
	var card = getParam(html, null, null, new RegExp('<li[^>]*data-cardId="\\d+[\\s\\S]*?data-last4digits="' + cardNum + '"[\\s\\S]*?</li>', 'i'));
	
	checkEmpty(card, 'Не удалось найти ' + (prefs.lastdigits ? 'карту с последними цифрами ' + prefs.lastdigits : 'ни одной карты!'), true);
	
	// Нужно запросить детали по карте
	html = AnyBalance.requestPost(baseurl + 'iqc/controller/internal/cardinfo/loadCardInfo.action?nocache=' + Math.random(), createParamsFromHtml(card), addHeaders({
		Referer: baseurl + 'iqc/pages/cabinet/cards.html',
		'X-Requested-With':'XMLHttpRequest'
	}));
	
	var json = getJson(html);
	
	var result = {success: true};
	
	// Баланс
	getParam(json.balance+'', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	// Кредитные средства
	getParam(json.loanFunds+'', result, 'loan', null, replaceTagsAndSpaces, parseBalance);
	// Собственные средства
	getParam(json.ownFunds+'', result, 'own', null, replaceTagsAndSpaces, parseBalance);
	
	getParam(json.brandName + ' ' + json.last4digits, result, '__tariff');
	getParam(json.ownerFio, result, 'fio');
	getParam(json.expiresAt, result, 'till', null, replaceTagsAndSpaces, parseDateWord);
	
	AnyBalance.setResult(result);
}

function createParamsFromHtml(html) {
	var returnParams = {};
	
	var params = sumParam(html, null, null, /data-[^=]+="[^"]+"/ig, replaceTagsAndSpaces, html_entity_decode);
	
	for (var i = 0; i < params.length; i++) {
		var current = params[i];
		
		var match = /data-([^=]+)="([\s\S]*)"$/i.exec(current);
		if(match) {
			returnParams[match[1]] = match[2];
		}
	}
	return returnParams;
}