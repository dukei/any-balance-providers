/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    Connection:'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11'
};

function main() {
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var baseurl = 'https://client.mdmbank.ru/retailweb/';

    var html = AnyBalance.requestGet(baseurl + 'login.asp', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'login.asp', {
		unc: prefs.login,
		pin: prefs.password
	}, addHeaders({Referer: baseurl + 'login.asp'}));
	
	if(!/logout\.asp/i.test(html)) {
		if(/<h4>\s*Подтверждение входа в Интернет-банк/i.test(html))
			throw new AnyBalance.Error('Для работы провайдера необходимо отключить смс-подтверждение входа в интернет-банк.');
		
		var error = getParam(html, null, null, /<label[^>]*>((?:[\s\S](?!<\/label>))*RetailWeb.Web.ClientLogin[\s\S]*?)<\/label>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в интернет-банк. Сайт изменен?');
	}
	
	if (prefs.type == 'crd')
		fetchCredit(baseurl);
	else if (prefs.type == 'acc')
		fetchAccount(baseurl);
	else if (prefs.type == 'card')
		fetchCard(baseurl);
	else if (prefs.type == 'dep')
		fetchDeposit(baseurl);
	else
		fetchCard(baseurl); //По умолчанию карта
}
function fetchCard(baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.contract && !/^\d{4}$/.test(prefs.contract))
        throw new AnyBalance.Error('Пожалуйста, введите 4 последних цифры номера карты, по которой вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первой карте.');

    var html = AnyBalance.requestGet(baseurl + 'cards.asp', addHeaders({Referer: baseurl + 'index.asp'}));

    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<\\/tr>))*\\d{4}X{7,8}' + (prefs.contract ? prefs.contract : '\\d{4}') + '[\\s\\S]*?<\\/tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.contract ? 'карту с последними цифрами ' + prefs.contract : 'ни одной карты'));
    
    var result = {success: true};
    getParam(tr, result, ['currency', '__tariff'], /<td[^>]+class="card-currency"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'blocked', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'limit', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'till', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(tr, result, 'cardnum', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    var href = getParam(tr, null, null, /<a[^>]+href="([^"]*card-statement.asp[^"]*)"[^>]*>/i, null, html_entity_decode);
   
    if(AnyBalance.isAvailable('overlimit','comissiondebt','minpay','accnum')){
        html = AnyBalance.requestGet(baseurl + href, addHeaders({Referer: baseurl + 'cards.asp'}));
        getParam(html, result, 'overlimit', /Сумма использованных сверхлимитных средств[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'comissiondebt', /Комиссионная задолженность[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'minpay', /Минимальная сумма взноса[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'accnum', /Р\/с([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    }

    AnyBalance.setResult(result);
}

function fetchAccount(baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.contract && !/^\d{4,20}$/.test(prefs.contract))
        throw new AnyBalance.Error('Пожалуйста, введите не менее 4 последних цифр номера счета, по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому счету.');

    var html = AnyBalance.requestGet(baseurl + 'accounts.asp', addHeaders({Referer: baseurl + 'index.asp'}));

    //Сколько цифр осталось, чтобы дополнить до 20
    var accnum = prefs.contract || '';
    var accprefix = accnum.length;
    accprefix = 20 - accprefix;

    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<\\/tr>))*' + (accprefix > 0 ? '\\d{' + accprefix + '}' : '') + accnum + '\\s*<[\\s\\S]*?<\\/tr>)', 'i');
    var tr = getParam(html, null, null, re);

    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.contract ? 'счет с последними цифрами ' + prefs.contract : 'ни одного счета'));
    
    var result = {success: true};
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, ['currency', '__tariff'], /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'accname', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    /* Работает, но получать тарифный план, наверное, смысла нет

    var href = getParam(tr, null, null, /<a[^>]+href="([^"]*account-statement.asp[^"]*)"[^>]*>/i, null, html_entity_decode);
   
    if(AnyBalance.isAvailable('???')){
        html = AnyBalance.requestGet(baseurl + href, addHeaders({Referer: baseurl + 'accounts.asp'}));
    }

    */
    AnyBalance.setResult(result);
}

function fetchDeposit(baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.contract && !/^\d{4,20}$/.test(prefs.contract))
        throw new AnyBalance.Error('Пожалуйста, введите не менее 4 последних цифр номера счета вклада, по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому вкладу.');

    var html = AnyBalance.requestGet(baseurl + 'deposits.asp', addHeaders({Referer: baseurl + 'index.asp'}));

    //Сколько цифр осталось, чтобы дополнить до 20
    var accnum = prefs.contract || '';
    var accprefix = 20 - accnum.length;

    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<\\/tr>))*' + (accprefix > 0 ? '\\d{' + accprefix + '}' : '') + accnum + '\\s*<[\\s\\S]*?<\\/tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.contract ? 'вклад с последними цифрами ' + prefs.contract : 'ни одного вклада'));
    
    var result = {success: true};
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, ['currency', '__tariff'], /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'till', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(tr, result, 'pct', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    var href = getParam(tr, null, null, /<a[^>]+href=["']([^"']*deposit-statement.asp[^"']*)["'][^>]*>/i, null, html_entity_decode);
   
    if(AnyBalance.isAvailable('nextpct')){
        html = AnyBalance.requestGet(baseurl + href, addHeaders({Referer: baseurl + 'deposits.asp'}));
        getParam(html, result, 'nextpct', /Дата следующей уплаты процентов:([^<]*)/i, replaceTagsAndSpaces, parseDate);
    }

    AnyBalance.setResult(result);
    
}

function fetchCredit(baseurl){
    var prefs = AnyBalance.getPreferences();

    if(prefs.contract && !/^\d{6,10}$/.test(prefs.contract))
        throw new AnyBalance.Error('Пожалуйста, введите номер кредита, по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому кредиту.');

    throw new AnyBalance.Error('Кредиты пока не поддерживаются, обратитесь к автору провайдера.');
}