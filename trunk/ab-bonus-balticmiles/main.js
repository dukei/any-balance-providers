﻿/**
Provider AnyBalance (http://any-balance-providers.googlecode.com)

Reading the information from BalticMiles account (http://www.balticmiles.com)
Author: valeravi (valeravi@vi-soft.com.ua)
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://www.balticmiles.com/en/";
    AnyBalance.setDefaultCharset('utf-8'); 

    AnyBalance.trace('POST: ' + baseurl + 'login');
    html = AnyBalance.requestPost(baseurl + 'login', {
    	redirect_url:baseurl,
        identity:prefs.login,
        password:prefs.password,
        login:"Login"
    }); 

    //После входа обязательно проверяем маркер успешного входа
    //Обычно это ссылка на выход, хотя иногда приходится искать что-то ещё
    if (!/\/Logout/i.test(html)){
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error("Can't enter to the account. Possible that website is changed.");
    }

    //Раз мы здесь, то мы успешно вошли в кабинет
    //Получаем все счетчики
    var result = {success: true};
    getParam(html, result, 'name', /class="hello"[\s\S]*?>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /class="userclass"[\s\S]*?>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /My Points:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

    if (isAvailable('card') ||
        isAvailable('statusbalance') ||
        isAvailable('explastupdated') ||
        isAvailable('expbalance1') ||
        isAvailable('expbalance2') ||
        isAvailable('expmonth1') ||
        isAvailable('expmonth2') ||
        isAvailable('expiration'))
    {
    	AnyBalance.trace('GET: ' + baseurl + 'my-account/account-statement');
        html = AnyBalance.requestGet(baseurl + 'my-account/account-statement');
        getParam(html, result, 'statusbalance', /<span>([^<>]*?)<\/span>[\s]*?Status Points/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'card', /Your BalticMiles card number:[\s\S]*?<span>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'explastupdated', /Point expiry information last updated:[\s\S]*?<span>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDateISO, 'expiration');
        expired = html.match(/Will expire[\s\S]*?<span>\s*<span>\s*([^<>]*?)<\/span>\s*in\s([^<>]*?)\s*<\/span>\s*<span>\s*<span>\s*([^<>]*?)<\/span>\s*in\s([^<>]*?)\s*<\/span>/i);
        if (expired != null && expired.length >= 5)
        {
        	getParam(expired[1], result, 'expbalance1', null, replaceTagsAndSpaces, parseBalance, 'expiration');
        	getParam(expired[2], result, 'expmonth1', null, replaceTagsAndSpaces, html_entity_decode, 'expiration');
        	getParam(expired[3], result, 'expbalance2', null, replaceTagsAndSpaces, parseBalance, 'expiration');
        	getParam(expired[4], result, 'expmonth2', null, replaceTagsAndSpaces, html_entity_decode, 'expiration');
        	if (isAvailable('expiration'))
        	{
            	var date = new Date(result['explastupdated']);
            	result['expiration'] = result['expbalance1'] + ' in ' + result['expmonth1'] + ', ' +
                	result['expbalance2'] + ' in ' + result['expmonth2'] +
                	', updated at: ' + date.getDate() + '/' + (date.getMonth()+1) + '/' + date.getFullYear();
        	}
        }
    }
	
    //Возвращаем результат
    AnyBalance.setResult(result);
}
