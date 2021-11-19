/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Encoding': 'gzip, deflate, br',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.6',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36'
};

var baseurl = "https://ibank.finam.ru";
var g_rVToken;
var g_savedData;
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(?:\d)?(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function main(){
    var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	if(!g_savedData)
		g_savedData = new SavedData('finambank', prefs.login);

	g_savedData.restoreCookies();

    AnyBalance.trace ('Пробуем войти в личный кабинет...');
	
	var html = AnyBalance.requestGet(baseurl + '/Products', g_headers);
	
	if(AnyBalance.getLastStatusCode() >= 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте ещё раз позже');
    }
	
	if(!/LogOn/i.test(html)){
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}else{
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
    	loginSite(prefs);
    }

    var result = {success: true};
	
	AnyBalance.trace('Пробуем получить данные по продуктам...');
	
	html = AnyBalance.requestGet(baseurl + '/Products', g_headers);
		
	getParam(html, result, '__tariff', /<div[^>]+class="ssm light"[^>]*>Счет карты, тариф &#171;([\s\S]*?)&#187;<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'fio', /<span[^>]+class="name-wrap">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
		
	var accounts = getElements(html, /<tr[^>]+class="(?:account-row )?"[^>]*>/ig);
	AnyBalance.trace('Найдено счетов: ' + accounts.length);	

	if(accounts.length < 1)
		throw new AnyBalance.Error('У вас нет ни одного счета');

	var curAcc;
    var href;
	for(var i=accounts.length-1; i>=0; i--){
		var account = getParam(accounts[i], /id="default-(?:card)?acc[\s\S]*?[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);
		var accHref = getParam(accounts[i], /<[^>]+href="([\s\S]*?)" (?:id="default)?/i, replaceTagsAndSpaces);
	   	AnyBalance.trace('Найден счет ' + account);
	   	if(!curAcc && (!prefs.num || endsWith(account, prefs.num))){
	   		AnyBalance.trace('Выбран счет ' + account);
	   		curAcc = account;
			href = accHref;
	   	}
	}

	if(!curAcc)
	   	throw new AnyBalance.Error('Не удалось найти счет с последними цифрами ' + prefs.num);
		
	var html = AnyBalance.requestGet(baseurl + href, g_headers);
		
	if (/Информация по карточному счету/i.test (html)){
		AnyBalance.trace('Пробуем получить данные по карточному счету...');
		
		getParam(html, result, ['balance', 'currency'], /Доступные средства[\s\S]*?<div[^>]+class="">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, ['currency', 'balance'], /Доступные средства[\s\S]*?<div[^>]+class="">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseCurrencyMy);
		getParam(html, result, 'credit', /Кредитный лимит по договору[\s\S]*?<div>[\s\S]*?<div>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'contract_number', /Договор<\/label>[\s\S]*?<div>([\s\S]*?) от [\s\S]*? г.<\/div>/i, replaceTagsAndSpaces);
		getParam(html, result, 'contract_date', /Договор<\/label>[\s\S]*?<div>[\s\S]*? от ([\s\S]*?)\s(?:г\.)?<\/div>/i, replaceTagsAndSpaces, parseDateWord);
		getParam(html, result, 'contract_rate', /Ставка по кредитному договору[\s\S]*?<div>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		getParam(html, result, 'account_number', /Cчет[\s\S]*?<div>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		getParam(html, result, 'account_date', /Дата открытия счета[\s\S]*?<div>([\s\S]*?)\s(?:г\.)?<\/div>/i, replaceTagsAndSpaces, parseDateWord);
		getParam(html, result, 'account_type', /<span[^>]+id="account-type">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
		getParam(html, result, 'currency_full', /Доступные средства[\s\S]*?<div[^>]+class="">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseCurrency);
		getParam(html, result, 'credit_risk', /Кредитный риск[\s\S]*?<div[^>]+class="result"[^>]*>?([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		getParam(html, result, 'credit_ratio', /Доля[\s\S]*?<div[^>]+class="result"[^>]*>?([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		getParam(html, result, 'phone', /<span[^>]+class="format-phone">([\s\S]*?)<\/span>/i, replaceNumber);
		
		var accCards = getElements(html, [/<td>[\s\S]*?<div[^>][\s\S]*?[\s\S]*?<div[^>]+class="product-list-item"[^>]*>/ig, /Действующая/i]);
		AnyBalance.trace('Найдено карт: ' + accCards.length);
		
		if(accCards){
			// Данные по картам
		    for(var i=0; i<accCards.length; i++){
				if (/Основная/i.test(accCards[i])) {
			        getParam(accCards[i], result, 'card', /id="default-card[\s\S]*?[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);
		        } else if (/Дополнительная/i.test(accCards[i])){
		        	var cAcc = (i >= 0 ? 'card_' + (i + 1) : 'card_');
		            getParam(accCards[i], result, cAcc, /id="default-card[\s\S]*?[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);
		        }
			}
	    }else{
 	    	AnyBalance.trace('Не удалось получить данные по картам');
 	    }
	} else if (/Информация по счету/i.test (html)){
		AnyBalance.trace('Пробуем получить данные по текущему счету...');
		
		getParam(html, result, ['balance', 'currency'], /Доступный остаток[\s\S]*?<span[^>]+class="">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, ['currency', 'balance'], /Доступный остаток[\s\S]*?<span[^>]+class="">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseCurrencyMy);
		getParam(html, result, 'balance_rest', /Остаток на счете[\s\S]*?<span[^>]+class="">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'balance_block', /Заблокировано до завершения[\s\S]*?<span[^>]+class="">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'contract_number', /Договор<\/label>[\s\S]*?<div>([\s\S]*?) от [\s\S]*? г.<\/div>/i, replaceTagsAndSpaces);
		getParam(html, result, 'contract_date', /Договор<\/label>[\s\S]*?<div>[\s\S]*? от ([\s\S]*?)\s(?:г\.)?<\/div>/i, replaceTagsAndSpaces, parseDateWord);
		getParam(html, result, 'account_number', /Cчет[\s\S]*?<div>([\s\S]*?)<a href/i, replaceTagsAndSpaces);
		getParam(html, result, 'account_date', /Дата открытия счета[\s\S]*?<div>([\s\S]*?)\s(?:г\.)?<\/div>/i, replaceTagsAndSpaces, parseDateWord);
		getParam(html, result, 'account_type', /<span[^>]+id="account-type">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
		getParam(html, result, 'currency_full', /Валюта счета[\s\S]*?<div>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		getParam(html, result, 'sms_inform', /SMS-информирование[\s\S]*?<span>([\s\S]*?)\.?<\/span>/i, replaceTagsAndSpaces);
		getParam(html, result, 'phone', /<span[^>]+class="format-phone">([\s\S]*?)<\/span>/i, replaceNumber);
	}
	
	AnyBalance.setResult(result);
}

function loginSite(prefs){
	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');	
	
    AnyBalance.setDefaultCharset('utf-8');
	
    var html = AnyBalance.requestGet(baseurl + '/User/LogOn', g_headers);

    var g_rVToken = getParam(html, /<input[^>]+name="__RequestVerificationToken"[^>]*value="([^"]*)/i, replaceHtmlEntities);
	AnyBalance.trace('Токен верификации запроса: ' + g_rVToken);
	
	if(!g_rVToken){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти токен верификации запроса. Сайт изменён?');
	}
	if(AnyBalance.getLastStatusCode() >= 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте ещё раз позже');
    }
	if(/технически|technical/i.test(html)){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('На сайте ведутся технические работы. Попробуйте ещё раз позже');
	}

    var params = [
		['__RequestVerificationToken',g_rVToken],
		['UserName',prefs.login],
		['Password',prefs.password]
	];
	
	html = AnyBalance.requestPost(baseurl + '/User/LogOn', params, addHeaders({
		'Content-Type': 'application/x-www-form-urlencoded',
		'Referer': AnyBalance.getLastUrl(),
		'upgrade-insecure-requests': '1'
	}));
	
	var phone = getParam(html, /smsConfirmationPhone: '([\s\S]*?)'/i, replaceTagsAndSpaces);
	var deviceId = getParam(html, /deviceId=([^']*)/i, replaceHtmlEntities);
	AnyBalance.trace('Id устройства:  ' + deviceId);
	
    if(!deviceId){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти Id устройства. Сайт изменён?');
	}
	
	AnyBalance.trace('Сайт затребовал проверку с помощью кода подтверждения из SMS');
	
	var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на номер ' + phone, null, {inputType: 'number', time: 170000});
	
	var params = [
		['__RequestVerificationToken',g_rVToken],
		['sms-confirm-code',code],
		['ConfirmationCode',code]
	];
	
	AnyBalance.trace('Пробуем войти по логину ' + prefs.login + ' и паролю...');
	
	html = AnyBalance.requestPost(baseurl + '/User/LogOnSmsConfirm?deviceId=' + deviceId, params, addHeaders({
		'Content-Type': 'application/x-www-form-urlencoded',
		'Referer': AnyBalance.getLastUrl(),
		'upgrade-insecure-requests': '1'
	}));
	
	if(/LogOn/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="validation-summary-errors"[\s\S]*?<li>([\s\S]*?)<\/li>/ig, replaceTagsAndSpaces);
	    if(error)
	    	throw new AnyBalance.Error(error, null, /логин|парол/i.test(error));
		
	    AnyBalance.trace(html);
	    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');			
	}
	
	g_savedData.setCookies();
	g_savedData.save();
	return html;
}

var g_currency = {
	RUB: '₽',
	RUR: '₽',
	USD: '$',
	EUR: '€',
	GBP: '£',
	JPY: 'Ұ',
	CHF: '₣',
	CNY: '¥',
	undefined: ''
};

function parseCurrencyMy(text){
    var currency = parseCurrency(text);
    return g_currency[currency] ? '' + g_currency[currency] : currency;
}