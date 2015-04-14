/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
    var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Пожалуйста, укажите логин для входа в ИНФО-Банк!');
	checkEmpty(prefs.password, 'Пожалуйста, укажите пароль для входа в ИНФО-Банк!');
	
    var baseurl = 'https://info-msk.rusfinance.ru:' + (prefs.port || 7779)+ '/';
    AnyBalance.setDefaultCharset('utf-8');
	
    var html = AnyBalance.requestGet(baseurl + 'jsso/SSOLogin');
	
    html = AnyBalance.requestPost(baseurl + 'jsso/j_security_check', {
        username:prefs.login,
        j_password:prefs.password,
        j_username:prefs.login,
        //'checkForm.mandatoryField':'Обязательное поле!',
        //'action.incorrectInputData':'Введенные данные некорректны!'
    }, {Referer: baseurl + 'jsso/SSOLogin'});
	
    if(!/"logout\.jsp"/i.test(html)){
        var error = getParam(html, null, null, /<td[^>]+id="login\.error"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
		
        throw new AnyBalance.Error('Не удалось войти в ИНФО-банк. Сайт изменен?');
    }

    if(prefs.num)
        html = AnyBalance.requestGet(baseurl + 'ICA/creditDetails.jsp?contract_number=' + prefs.num + '&system_code=EQ');
	
    fetchCredit(baseurl, html, prefs);
}

function fetchCredit(baseurl, html, prefs) {
    var result = {success: true};
	
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
	
    AnyBalance.setResult(result);
}