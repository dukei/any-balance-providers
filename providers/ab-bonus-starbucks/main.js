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
	var baseurl = 'https://cabinet.plas-tek.ru/default.aspx?';
	AnyBalance.setDefaultCharset('UTF-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'mainlogin=true&style=starbucks', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var eventValidation = getParam(html, null, null, /id="__EVENTVALIDATION"[\s\S]*?value="([\s\S]*?)"[^>]*>/i);
	var viewStateGen = getParam(html, null, null, /id="__VIEWSTATEGENERATOR"[\s\S]*?value="([\s\S]*?)"[^>]*>/i);
	var viewState = getParam(html, null, null, /id="__VIEWSTATE"[\s\S]*?value="([\s\S]*?)"[^>]*>/i);
	html = AnyBalance.requestPost(baseurl + 'mainlogin=true&style=starbucks', {
		LoginTextBox1: prefs.login,
		PasswordTextBox2: prefs.password,
		__EVENTVALIDATION: eventValidation,
		__VIEWSTATE: viewState,
		__VIEWSTATEGENERATOR: viewStateGen,
		LoginLinkButtonDynamic: 'Войти',
		offset: 3,
		'Remember': 'false'
	}, addHeaders({Referer: baseurl + 'mainlogin=true&style=starbucks'}));

	if (!/Баланс карты/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+id="pnlMessage"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Ошибка входа/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};
	
	getParam(html, result, 'stars', /pnlCardInfo[^>]*>[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cardNumber', /lblCardNumber[^>]*>[\s\S]*?<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance', /lblCardBalance[^>]*>[\s\S]*?<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /lblCardStatus[^>]*>([^;]*);/i, replaceTagsAndSpaces);

	eventValidation = getParam(html, null, null,/id="__EVENTVALIDATION"[\s\S]*?value="([\s\S]*?)"[^>]*>/i);
	viewState = getParam(html, null, null, /id="__VIEWSTATE"[\s\S]*?value="([\s\S]*?)"[^>]*>/i);
	html = AnyBalance.requestPost(baseurl+'style=starbucks',{
		__VIEWSTATEGENERATOR: viewStateGen,
		__VIEWSTATE: viewState,
		offset:3,
		__EVENTVALIDATION:eventValidation,
		__EVENTTARGET: 'CardsEnableForm',
	}, addHeaders({Referer: baseurl+ 'style=starbucks'}));

	getParam(html, result, 'fName', /name="tbProfileFirstName"[^>]+value="([\s\S]*?)"[^>]*>/i, replaceTagsAndSpaces);
	getParam(html, result, 'sName', /name="tbProfileSurname"[^>]+value="([\s\S]*?)"[^>]*>/i, replaceTagsAndSpaces)
	AnyBalance.setResult(result);
}