/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36'
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

	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'LoginTextBox1')
			return prefs.login;
		else if (name == 'PasswordTextBox2')
			return prefs.password;
		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'mainlogin=true&style=starbucks', params, addHeaders({Referer: baseurl + 'mainlogin=true&style=starbucks'}));

	if (!/Баланс карты/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+id="pnlMessage"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Ошибка входа/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};
	
	getParam(html, result, 'stars', /pnlCardInfo[^>]*>[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cardNumber', /lblCardNumber[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /lblCardBalance[^>]*>[\s\S]*?<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /lblCardStatus[^>]*>([^;]*);/i, replaceTagsAndSpaces);

	var eventValidation = getParam(html, null, null,/id="__EVENTVALIDATION"[^>]*value="([^"]+)/i);
	var viewState = getParam(html, null, null, /id="__VIEWSTATE"[^>]*value="([^"]+)/i);
	html = AnyBalance.requestPost(baseurl+'style=starbucks',{
		__VIEWSTATEGENERATOR: params['__VIEWSTATEGENERATOR'],
		__VIEWSTATE: viewState,
		offset:3,
		__EVENTVALIDATION:eventValidation,
		__EVENTTARGET: 'CardsEnableForm'
	}, addHeaders({Referer: baseurl+ 'style=starbucks'}));

	var fName = getParam(html, null, null, /name="tbProfileFirstName"[^>]+value="([^"]+)/i, replaceTagsAndSpaces, html_entity_decode) || '';
	var sName = getParam(html, null, null, /name="tbProfileSurname"[^>]+value="([^"]+)/i, replaceTagsAndSpaces, html_entity_decode || '');

	getParam(fName + ' ' + sName, result, 'fio');

	AnyBalance.setResult(result);
}