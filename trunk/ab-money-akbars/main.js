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

function getSid(html) {
	return getParam(html, null, null, /name='SID'[^>]*value='([^']+)/i);
}


function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://online.akbars.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'frontend/frontend', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'frontend/frontend', {
		'RQ_TYPE':'FAST_AUTH_START',
		'SCREEN_ID':'MAIN',
		'SID':getSid(html),
		'Step_ID':'0',
		'AUTH_METHOD':'FAST_PWA',
		'FAKE':'Логин',
		'USER_ID':prefs.login,
		'FAKE':'Пароль',
		'PASSWORD':prefs.password,
		'checkbox':'on',
	}, addHeaders({Referer: baseurl + 'frontend/frontend'}));
	
	if (!/logout/i.test(html)) {
		var error = sumParam(html, null, null, /id="warning_info"([^>]*>){2}/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
		if (error)
			throw new AnyBalance.Error(error, null, /неправильный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'fio', />Здравствуйте,([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
	
	var cardNum = prefs.cardnum || '\\d{4}';
	
	//(?:[\d*]+(?:&nbsp;|\s)?){3}9628(?:[^>]*>){50,70}\s*Подробнее
	var reCard = new RegExp('(?:[\\d*]+(?:&nbsp;|\\s)?){3}' + cardNum + '(?:[^>]*>){50,70}\\s*Подробнее(?:[^>]*>){5,20}\\s*</li>', 'i');
	var tr = getParam(html, null, null, reCard);
	
	checkEmpty(tr, 'Не удалось найти ' + (prefs.cardnum ? 'карту с последними цифрами ' + prefs.cardnum : 'ни одной карты!'), true);
	
	var params = createFormParams(tr);
	// Детальная инфа по карте
	html = AnyBalance.requestPost(baseurl + 'frontend/frontend', params, addHeaders({Referer: baseurl + 'frontend/frontend'}));	
	
	getParam(html, result, 'balance', /_BALANCE"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'debt', /Сумма задолженности([^>]*>){4}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'card_type', /_CARD_TYPE"[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'card_num', /_CARD_NUMBER"[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'card_status', /_CARD_STATUS"[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'card_acc', /Счет карты([^>]*>){4}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'card_exp', /Срок действия([^>]*>){4}/i, replaceTagsAndSpaces, parseDateWord);
	getParam(html, result, 'card_prod', /Кредитный продукт([^>]*>){4}/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}