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
	var baseurl = 'https://click.alfa-bank.by/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'webBank/private/details.action', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	html = AnyBalance.requestPost(baseurl + 'webBank/login.action', {        
        login: prefs.login,
        '__checkbox_saveLogin': true,
        password: prefs.password,
        loginEnterButton: 'Вход',
        tabKeyClient: ''
	}, addHeaders({Referer: baseurl + 'webBank/private/details.action'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<span[^>]+class="errorMessageHistory"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
    if(prefs.type == 'dep')
        processDep(html, baseurl);
    else if(prefs.type == 'credit')
        processCredit(html, baseurl);
    else if(prefs.type == 'acc')
        processAcc(html, baseurl);
    else 
        processCard(html, baseurl);
}

function processCard(html, baseurl){
	var prefs = AnyBalance.getPreferences();
	
    if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите 4 последних цифры номера карты или не вводите ничего, чтобы показать информацию по первой карте");
	
	var result = {success: true};
    
	// \d+[*]{11}\d{4}(?:[^>]*>){2,5}[^>]*"cardId"[^>]*value="([^"]+)
    var href_id = getParam(html, null, null, new RegExp('\\d+[*]{11}' + (prefs.cardnum || '\\d{4}') + '(?:[^>]*>){2,5}[^>]*"cardId"[^>]*value="([^"]+)', 'i'), replaceTagsAndSpaces);
    if(!href_id)
		throw new AnyBalance.Error("Не удалось найти " + (prefs.cardnum ? ' карту с последними цифрами ' + prefs.cardnum : 'ни одной карты!'));

 	detailsHtml = AnyBalance.requestPost(baseurl + 'webBank/private/card.details.action', {        
        cardId: href_id,
        tabKeyClient: ''
	}, addHeaders({Referer: baseurl + 'webBank/private/card.details.action'}));
    
    getParam(detailsHtml, result, 'card_number', /Номер карты:(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    getParam(detailsHtml, result, 'card_type', /Название карты:(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    getParam(detailsHtml, result, 'card_curr', /Валюта:(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    getParam(detailsHtml, result, 'expires', /Срок окончания действия карты:(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    getParam(detailsHtml, result, 'status', /Статус карты:(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	
	var acc_number = getParam(detailsHtml, null, null, /Номер счёта:(?:[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    getParam(acc_number, result, 'acc_number');
	
	if(isAvailable('balance') && acc_number) {
		AnyBalance.trace('Необходимо получить баланс по номеру счета...');
		
		processAcc(html, baseurl, acc_number, result);
	}
	
    AnyBalance.setResult(result);
}

function processAcc(html, baseurl, acc_number, ret_result){
	var prefs = AnyBalance.getPreferences();
	
    if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите 4 последних цифры номера счета или не вводите ничего, чтобы показать информацию по первому счету");
	
	if(!ret_result)
		var result = {success: true};
    else
		var result = ret_result;
	
	var table = getParam(html, null, null, /Имя счета([\s\S]*?)<\/table>/i);
	
    // \d+\d{4}(?:[^>]*>){2,5}[^>]*"id"[^>]*value="([^"]+)
	if(acc_number)
		var href_id = getParam(table, null, null, new RegExp(acc_number + '(?:[^>]*>){2,5}[^>]*"id"[^>]*value="([^"]+)', 'i'), replaceTagsAndSpaces, html_entity_decode);
	else
		var href_id = getParam(table, null, null, new RegExp('\\d+' + (prefs.cardnum || '\\d{4}') + '(?:[^>]*>){2,5}[^>]*"id"[^>]*value="([^"]+)', 'i'), replaceTagsAndSpaces, html_entity_decode);
	if(!href_id)
		throw new AnyBalance.Error("Не удалось найти " + (prefs.cardnum ? ' счет с последними цифрами ' + prefs.cardnum : 'ни одного счета!'));
	
 	html = AnyBalance.requestPost(baseurl + 'webBank/private/accounts.action', {
        id: href_id,
        tabKeyClient: ''
	}, addHeaders({Referer: baseurl + 'webBank/private/details.action'}));   
    
    getParam(html, result, 'acc_number', /Номер счёта:(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'acc_type', /Тип счёта:(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Доступный остаток:(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'limit', /Кредитный лимит:(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'min_balance', /Неснижаемый остаток:(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'limit', 'min_balance', 'balance'], /Доступный остаток:(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseCurrency);
    getParam(html, result, 'rate', /Процентная ставка, текущая:(?:[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	
	if(!ret_result)
		AnyBalance.setResult(result);
}

function processDep(html, baseurl){
	throw new AnyBalance.Error('Депозиты пока не поддерживаются, свяжитесь, пожалуйста, с разработчиками.');
}

function processCredit(html, baseurl, _accnum, result){
    throw new AnyBalance.Error('Кредиты пока не поддерживаются, свяжитесь, пожалуйста, с разработчиками.');
}