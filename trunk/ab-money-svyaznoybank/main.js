﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт Связного Банка через интернет банк.

Сайт оператора: http://iqbank.ru/
Личный кабинет: https://login.iqbank.ru
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.116 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://login.qbank.ru/";
    AnyBalance.setDefaultCharset("utf-8");

    checkEmpty(prefs.login, 'Введите ваш персональный клиентский номер!');
    checkEmpty(prefs.password, 'Введите ваш пароль для входа в интернет банк!');
    
    var html = AnyBalance.requestGet(baseurl + 'auth/UI/Login', g_headers);

    var csrfsign = getParam(html, null, null, /<input[^>]+name="csrf.sign"[^>]*value="([^"]*)/i, null, html_entity_decode);
    var csrfts = getParam(html, null, null, /<input[^>]+name="csrf.ts"[^>]*value="([^"]*)/i, null, html_entity_decode);

    if(!csrfsign)
        throw new AnyBalance.Error('Не найдена форма входа! Сайт изменен?');

    html = AnyBalance.requestPost(baseurl + 'auth/UI/Login', {
        r:'',
        IDToken1:prefs.login,
        IDToken2:prefs.password,
        IDButton:'login',
        'csrf.sign':csrfsign,
        'csrf.ts':csrfts
    }, addHeaders({Referer: baseurl + 'auth/UI/Login'}));

    if(!/qbank.ru\/auth\/UI\/Logout/i.test(html)){
        if(/otpCode/i.test(html))
            throw new AnyBalance.Error('Для работы этого провайдера требуется отключить в настройках интернет-банка подтверждение входа по СМС. Это безопасно, для совершения операций все равно будет требоваться подтверждение по СМС.');
        var error = getParam(html, null, null, /<div[^>]+class="err"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, /Неверный персональный номер или пароль/i.test(error)); //Фатальная ошибка, надо настройки менять
        error = getParam(html, null, null, /<h2[^>]*>([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error && /Срок действия пароля истек/i.test(error))
            throw new AnyBalance.Error('Банк сообщает, что срок действия пароля истек. Пожалуйста, зайдите в интернет банк через браузер, смените пароль, затем введите новый пароль в настройки этого провайдера.', null, true);
        if(error){
            var error1 = getParam(html, null, null, /<div[^>]+class="recover"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
            if(error1) error += ' ' + error1;
            throw new AnyBalance.Error(error);
        }
        error = getParam(html, null, null, /<div[^>]+class="b_card"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в интернет-банк. Сайт изменен?');
    }

    baseurl = "https://qbank.ru";
//    html = AnyBalance.requestGet(baseurl, g_headers);

    if(prefs.what == 'card'){
        fetchCard(baseurl, html);
    }else if(prefs.what == 'dep'){
        fetchDep(baseurl, html);
    }else{
        fetchCard(baseurl, html);
    }
}

function fetchCard(baseurl, html){
    var prefs = AnyBalance.getPreferences();
    if(prefs.num && !/^\d{4}$/.test(prefs.num))
        throw new AnyBalance.Error("Введите 4 последних цифры номера карты или не вводите ничего, чтобы показать информацию по первой карте");

    var products = getParam(html, null, null, /Page.products\s*=\s*(\[.*?\]);/, null, getJson);
    var cards = getParam(html, null, null, /cards:\s*(\{.*\}),/, null, getJson);
    var product;
    for(var i=0; i<products.length; ++i){
        var p = products[i];
        if(p.CardId && cards[p.CardId] && (!prefs.num || (prefs.num && endsWith(cards[p.CardId].Number, prefs.num)))){
            product = p;
            break;
        }
    }

    if(!product)
        throw new AnyBalance.Error(prefs.num ? "Не удалось найти карту с последними цифрами " + prefs.num : "Не удалось найти ни одной карты");

    var theSameCards = [product];
    for(var i=0; i<products.length; ++i){
        if(products[i].ProductId == product.ProductId && products[i].CardId != product.CardId && products[i].CardId)
            theSameCards.push(products[i]);
    }

    var result = {success: true};
    getParam(product.CurrencyTitle, result, ['currency', 'balance', 'accamount']);

    if(AnyBalance.isAvailable('accnum')){
        var html = AnyBalance.requestGet(baseurl + '/Account/Details?account=' + product.AccountNumber);
        getParam(html, result, 'accnum', /Номер счета:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    }

    for(var i=0; i<theSameCards.length && i<4; ++i){
        var p = theSameCards[i];
        var suffix = (i==0 ? '': i);
        getParam(cards[p.CardId].Number, result, 'cardnum' + suffix);
        if(i==0)
            getParam(cards[p.CardId].Number, result, '__tariff');
        if(AnyBalance.isAvailable('cardballs' + suffix)){
            var html = AnyBalance.requestGet(baseurl + p.BalanceUrl, g_headers);
            var json = getJson(html);
            getParam(json.balls, result, 'cardballs' + suffix, null, replaceTagsAndSpaces, parseBalance);
        }

        if((AnyBalance.isAvailable('balance') && !isset(result.balance)) || (AnyBalance.isAvailable('accamount') && !isset(result.balance)) || AnyBalance.isAvailable('cardname' + suffix)){
            var html = AnyBalance.requestGet(baseurl + p.DetailsUrl, g_headers);
            var json = getJson(html);
            if(!isset(result.balance))
                getParam(json.balance, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
            if(!isset(result.accbalance))
                getParam(json.html, result, 'accamount', /Собственные средства:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(json.html, result, 'cardname' + suffix, /<h3[^>]*>([\s\S]*?)<\/h3>/i, replaceTagsAndSpaces, html_entity_decode);
        }
    }

    AnyBalance.setResult(result);
}

function fetchDep(baseurl, html){
    var prefs = AnyBalance.getPreferences();
    if(prefs.num && !/^\d+$/.test(prefs.num))
        throw new AnyBalance.Error("Введите ID депозита или не вводите ничего, чтобы показать информацию по первому депозиту. ID депозитов можно увидеть в счетчике Сводка.");

    var products = getParam(html, null, null, /Page.products\s*=\s*(\[.*?\]);/, null, getJson);
    var cards = getParam(html, null, null, /cards:\s*(\{.*\}),/, null, getJson);

    var result = {success: true};
    if(AnyBalance.isAvailable('all')){
        var all = [];
        var deposits = sumParam(html, null, null, /<div[^>]+data-id=[\s\S]*?<div[^>]+class="inner-card[\s\S]*?<\/div>/ig);
        for(var i=0; i<deposits.length; ++i){
            if(/<span[^>]+class="number">/i.test(deposits[i]))
                continue; //Это не депозит
            var pid = getParam(deposits[i], null, null, /<div[^>]+data-id="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
            var name = getParam(deposits[i], null, null, /<h2[^>]*>([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);
            all.push(pid + ': ' + name);
        }
        result.all = all.join('\n');
    }

    var product;
    for(var i=0; i<products.length; ++i){
        var p = products[i];
        if(!p.CardId && /Deposit/i.test(p.DetailsUrl) && (!prefs.num || prefs.num == p.ProductId)){
            product = p;
            break;
        }
    }

    if(!product)
        throw new AnyBalance.Error(prefs.num ? "Не удалось найти депозит с ID " + prefs.num : "Не удалось найти ни одного депозита");

    getParam(product.CurrencyTitle, result, ['currency', 'balance', 'accamount']);

    var html = AnyBalance.requestGet(baseurl + product.AjaxUrl);
    getParam(html, result, 'accname', /<h2[^>]*>([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /<h2[^>]*>([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('balance', 'accnum')){
        var html = AnyBalance.requestGet(baseurl + product.DetailsUrl);
        var json = getJson(html);
        getParam(json.html, result, 'accnum', /Номер счета:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(json.html, result, 'balance', /Баланс:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }

    AnyBalance.setResult(result);
}

