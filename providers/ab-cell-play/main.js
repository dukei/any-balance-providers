/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.86 Safari/537.36'
};

function main() {
	prefs = AnyBalance.getPreferences();
	var baseurlMobile = "https://m24.play.pl/mplay24-lajt/";
	var baseurl = 'https://logowanie.play.pl/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Enter login!');
	checkEmpty(prefs.password, 'Enter password!');
	
	var html = AnyBalance.requestGet(baseurlMobile+'home?wicket', g_headers);
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Error connecting to the site! Try to refresh the data later.');
	}

	//нужно забрать с моб.версии сайта SAMLrequest & target
	var params = getFormParams(html);
	//забираем с ответа URL, куда нужно делать POST запрос для перехода на страницу входа в ЛК
	var postHref = getParam(html, null,null, /action\s*=\s*"([\s\S]*?)"/i);
	if(!postHref)
		throw new AnyBalance.Error("Can't find login page URL adress. Site changed?");

	html = AnyBalance.requestPost(postHref, params, addHeaders({
		Referer: baseurlMobile+'home?wicket'
	}));

	params = getFormParams(html);
	html = AnyBalance.requestPost(baseurl+'opensso/logowanie', params, addHeaders({
		Referer: baseurl+'/p4-idp2/SSOrequest.do'
	}));

	postHref = getParam(html, null, null, /<form[^>]+name\s*=\s*"Response"[^>]+action\s*=\s*"([\s\S]*?)"/i);
	if (!postHref) {
		var error = getParam(html, null, null, /<p[^>]+errorCommunicate[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Błędne hasło lub nazwa użytkownika/i.test(error));

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Can`t login to selfcare. Site changed?');
	}

	//Отправляем POST запрос, чтобы вернуться на мобильную версию
	params = getFormParams(html);
	html = AnyBalance.requestPost(postHref, params);

	var result = {success: true};

	if(isAvailable(['__tariff', 'account', 'daysLeft', 'promocja', 'phone'])) {

		getParam(html, result, '__tariff', /Taryfa(?:[\s\S]*?[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'account', /Numer konta(?:[\s\S]*?[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'daysLeft', /Koniec bieżącego okresu rozliczeniowego za(?:[\s\S]*?[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'promocja', /Promocja(?:[\s\S]*?[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'phone', /MyNumbersMain(?:[\s\S]*?[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	}

	if(isAvailable(['balance, pakietZolotowek, min_all, min_promocyjne, traffic, doladowan, incomingCallsDate, outgoingCallsDate']))
	{
		var href = getParam(html, null, null, /<ul[^>]*class\s*=\s*"nav"[^>]*>(?:[\s\S]*?<li[^>]*>){3}<a[^>]+href="([\s\S]*?)"/i);
		if(!href)
			AnyBalance.trace("Can't find page with information. Site changed?");

		html = AnyBalance.requestGet(baseurlMobile+'home'+href, g_headers);
		getParam(html, result, 'balance', /col left-col[^>]*>(?:[\s\S]*?[^>]*>){5}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'pakietZlotowek', /Pakiet Złotówek(?:[\s\S]*?[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'min_all', /Minuty do wszystkich(?:[\s\S]*?[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseMinutes);
		getParam(html, result, 'min_promocyjne', /Promocyjne minuty do wszystkich(?:[\s\S]*?[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseMinutes);
		getParam(html, result, 'traffic', /Promocyjne MB(?:[\s\S]*?[^>]*>){3}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseTraffic);
		getParam(html, result, 'doladowan', /Suma doładowań w tym miesiącu(?:[\s\S]*?[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'incomingCallsDeadline', /Ważność połączeń przychodzących(?:[\s\S]*?[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
		getParam(html, result, 'outgoingCallsDeadline', /Ważność połączeń wychodzących(?:[\s\S]*?[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
	}

	AnyBalance.setResult(result);
}
function getFormParams(html) {
	return createFormParams(html, function(params, str, name, value) {
		if (name == 'IDToken1')
			return prefs.login;
		else if (name == 'IDToken2')
			return prefs.password;
		return value;
	});
}