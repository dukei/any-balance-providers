/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт и кредитов Московского Кредитного Банка, используя систему Интернет-Банк.

Сайт оператора: http://mkb.ru/
Личный кабинет: https://online.mkb.ru
*/

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function getEventValidation(html){
    return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/);
}

function getViewState1(html){
    return getParam(html, null, null, /__VIEWSTATE\|([^\|]*)/i);
}

function getEventValidation1(html){
    return getParam(html, null, null, /__EVENTVALIDATION\|([^\|]*)/i);
}

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://online.mkb.ru";
    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestGet(baseurl + '/secure/login.aspx?newsession=1');
    var eventvalidation = getEventValidation(html);
    var viewstate = getViewState(html);

    html = AnyBalance.requestPost(baseurl + '/secure/login.aspx?newsession=1', {
      __EVENTTARGET:'',
      __EVENTARGUMENT:'',
      __VIEWSTATE:viewstate,
      __EVENTVALIDATION:eventvalidation,
      txtLogin:prefs.login,
      txtPassword:prefs.password,
      btnLoginStandard:'Войти'
    });

    error = getParam(html, null, null, /<span[^>]*id="lblErrorMsg"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    var logout = getParam(html, null, null, /(\/secure\/logout.aspx)/i);
    if(!logout)
        throw new AnyBalance.Error("Не удалось зайти в интернет банк. Неправильный логин-пароль или проблемы на сайте.");

    if(prefs.type == 'card')
        fetchCard(html, baseurl);
    else if(prefs.type == 'crd')
        fetchCredit(html, baseurl);
    else
        fetchCard(html, baseurl);
    
}

function fetchCard(html, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.num && !/^\d{4}$/.test(prefs.num))
        throw new AnyBalance.Error("Укажите 4 последних цифры карты или не указывайте ничего, чтобы получить информацию по первой карте.");

    var $html = $(html);
    var $card = $html.find('tr.btnrscards' + (prefs.num ? ':has(td[title*="***' + prefs.num + '"])' : '')).first();
    if(!$card.size())
        throw new AnyBalance.Error(prefs.num ? "Не удалось найти карту с последними цифрами " + prefs.num : "Не удалось найти ни одной карты!");

    var result = {success: true};
    
    getParam($card.find('td:first-child').attr('title'), result, 'cardnum', null, replaceTagsAndSpaces);
    getParam($card.find('td:first-child').text(), result, 'type', null, replaceTagsAndSpaces);
    getParam($card.find('td:first-child').text(), result, '__tariff', null, replaceTagsAndSpaces);
    getParam($card.find('td.money').text(), result, 'balance', null, replaceTagsAndSpaces, parseBalance);
    getParam($card.find('td.money').text(), result, 'currency', null, replaceTagsAndSpaces, parseCurrency);

    var href = $card.find('td:first-child a').attr('href');
    if(!href)
        AnyBalance.trace('Не удалось обнаружить ссылку на подробную информацию по карте');
    
    if(AnyBalance.isAvailable('accnum', 'needpay', 'needpaytill', 'grace', 'gracetill', 'pct', 'credit', 'limit') && href){
        html = AnyBalance.requestGet(baseurl + href);
        getParam(html, result, 'accnum', /Номер счета:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
        getParam(html, result, 'needpay', /Обязательный платеж\.[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'needpaytill', /Обязательный платеж\.[^<]*\s+по\s+([^<]*)/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'gracepay', /Отчетная задолженность\.[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'gracepaytill', /Отчетная задолженность\.[^<]*\s+по\s+([^<]*)/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'pct', /Срочные проценты[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'credit', /Срочный Кредит[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'limit', /Установленный лимит задолженности[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    }
    
    AnyBalance.setResult(result);
}

function fetchCredit(html, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.num && !/^[\d\/\\]{2,}$/.test(prefs.num))
        throw new AnyBalance.Error("Укажите первые цифры (не менее 2) номера кредитного договора или не указывайте ничего, чтобы получить информацию по первому кредитному договору.");

    var $html = $(html);
    var $crd = $html.find('tr.btnrsloans' + (prefs.num ? ':has(td[title^="' + prefs.num + '"])' : '')).first();
    if(!$crd.size())
        throw new AnyBalance.Error(prefs.num ? "Не удалось найти кредитный договор с первыми цифрами " + prefs.num : "Не удалось найти ни одного кредита!");

    var result = {success: true};
    
    var crdid = getParam($crd.find('td:first-child').attr('title'), null, null, null, replaceTagsAndSpaces);
    getParam($crd.find('td:first-child').attr('title'), result, 'cardnum', null, replaceTagsAndSpaces);
    getParam($crd.find('td:first-child').text(), result, 'type', null, replaceTagsAndSpaces);
    getParam($crd.find('td:first-child').text(), result, '__tariff', null, replaceTagsAndSpaces);
    getParam($crd.find('td.money').text(), result, 'balance', null, replaceTagsAndSpaces, parseBalance);
    getParam($crd.find('td.money').text(), result, 'currency', null, replaceTagsAndSpaces, parseCurrency);

    var href = $crd.find('td:first-child a').attr('href');
    AnyBalance.trace('Ссылка на подробную инфу о кредите: ' + href);
    if(!href)
        AnyBalance.trace('Не удалось обнаружить ссылку на подробную информацию по кредиту');
    
    if(AnyBalance.isAvailable('accnum', 'needpay', 'needpaytill', 'pctcredit', 'limit', 'latedebt') && href){
        html = AnyBalance.requestGet(baseurl + href);

        var tr = getParam(html, null, null, /<tr[^>]*>(?:[\s\S](?!<\/tr>))*?<input[^>]+name="rbgLoans"[^>]*checked="checked"[\s\S]*?<\/tr>/i);
        if(!tr)
            AnyBalance.trace('Не удалось найти строку с подробной информацией по кредиту');
        
        getParam(tr, result, 'needpaytill', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);

        var idx;
        if(tr){
            idx = getParam(tr, null, null, /data-index="(\d+)/i, null, parseInt);
            if(!isset(idx))
                AnyBalance.trace('Не удалось найти индекс информации по кредиту');
        }

        var json = getParam(html, null, null, /var\s+loanDetailsData\s*=\s*(\[[\s\S]*?\])\s*(?:;|\r?\n\s*var)/, null, getJson);
        if(!json)
            AnyBalance.trace('Не удалось найти json-информацию по кредиту');

        if(!json || !json[idx] || !json[idx].dt){
            AnyBalance.trace('Не удалось найти в json информацию по кредиту');
        }else{
            var info = json[idx].dt;
            getParam(info, result, 'accnum', /Лицевой счет №:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, html_entity_decode);
            getParam(info, result, 'needpay', /Сумма ближайшего платежа:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
            getParam(info, result, 'pctcredit', /Текущая процентная ставка по кредиту:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
            getParam(info, result, 'limit', /Общая сумма кредита:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
            getParam(info, result, 'latedebt', /Просроченная задолженность по кредиту:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
        }
    }
    
    AnyBalance.setResult(result);
}
