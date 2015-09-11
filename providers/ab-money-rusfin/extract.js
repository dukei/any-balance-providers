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

var baseurl;

function login(prefs){
	checkEmpty(prefs.login, 'Пожалуйста, укажите логин для входа в ИНФО-Банк!');
	checkEmpty(prefs.password, 'Пожалуйста, укажите пароль для входа в ИНФО-Банк!');
	
    baseurl = 'https://info-msk.rusfinance.ru:' + (prefs.port || 7779) + '/';
    AnyBalance.setDefaultCharset('utf-8');
	
    var html = AnyBalance.requestGet(baseurl + 'jsso/SSOLogin', g_headers);
	
    html = AnyBalance.requestPost(baseurl + 'jsso/j_security_check', {
        username:prefs.login,
        j_password:prefs.password,
        j_username:prefs.login,
        //'checkForm.mandatoryField':'Обязательное поле!',
        //'action.incorrectInputData':'Введенные данные некорректны!'
    }, addHeaders({Referer: baseurl + 'jsso/SSOLogin'}));
	
    if(!/logout\.jsp/i.test(html)){
        var error = getParam(html, null, null, /<td[^>]+id="login\.error"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
		
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в ИНФО-банк. Сайт изменен?');
    }
	
	return html;
    // if(prefs.num)
        // html = AnyBalance.requestGet(baseurl + 'ICA/creditDetails.jsp?contract_number=' + prefs.num + '&system_code=EQ', g_headers);
	
    // fetchCredit(baseurl, html, prefs);
}

function processCredit(prefs, result) {
	var html = AnyBalance.requestGet(baseurl + 'ICA/credit.jsp', g_headers);
    
	getParam(html, result, 'agreement', /Номер договора\s*:(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Остаток ссудной задолженности\s*:(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /Тип кредита[^:]*:(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'limit', /Сумма кредита(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, ['currency', 'balance', 'minpay', 'lastoppct', 'lastopcrd'], /Сумма кредита(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseCurrency);
    getParam(html, result, 'minpay', /ЕЖЕМЕСЯЧНЫЙ ПЛАТЕЖ(?:[^>]*>){4,6}В размере:(?:[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'minpaytill', /ЕЖЕМЕСЯЧНЫЙ ПЛАТЕЖ(?:[^>]*>){8,10}Рекомендуем внести(?:[^>]*>){1}\s*до([^<]*)/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'lastopdate', /<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>[^<]*?Проценты за/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'lastoppct', /Проценты за(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'lastopcrd', /погашение (?:кредита|займа) по(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
}

function processUserProfile(result) {
	var html = AnyBalance.requestGet(baseurl + 'ICA/changePersonalData.jsp', g_headers);
	
	getParam(html, result, 'fio', /'span#fullName'[^']+'([^']+)/i, replaceTagsAndSpaces, html_entity_decode);
}