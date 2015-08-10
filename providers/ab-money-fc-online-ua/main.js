/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию из личного кабинета банка "Финансы и Кредит" 

Operator site: https://fc-online.com.ua
*/

var g_headers = {
'Accept':'*/*',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.94 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://fc-online.com.ua/";

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'bankworld/ru/loginbrowser/login.xhtml', addHeaders({'Origin':'https://fc-online.com.ua'}, g_headers));

    var form = getParam(html, null, null, /<form[^>]+id="workForm"[^>]*>([\s\S]*?)<\/form>/i);    
    if(!form)
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');

    var params = createFormParams(form);
    params['username'] = prefs.login;
    params['userpassphrase'] = prefs.password;
    params['authMethod'] = 'HigherAuthentication';
    params[''] = '';

    html = AnyBalance.requestPost(baseurl + 'bankworld/ru/loginbrowser/login_action.bml', params, addHeaders({Referer: baseurl + 'bankworld/ru/loginbrowser/login.xhtml'})); 

    if (!/<status\s*>success<\/status>/i.test(html)){
        var error = getParam(html, null, null, /<message[^>]*>([\s\S]*?)<\/message>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + 'bankworld/ru/external/accounts/cards_xml.bml', addHeaders({'Referer': baseurl + 'bankworld/ru/external/cards.bml', 'X-Requested-With':'XMLHttpRequest' }, g_headers)); 

    var result = {success: true};
    html = html.replace(/ >/g, '>').replace(/\n/g, '');

    var xml = xml2json.parser(html),
        cartNum = new RegExp("^\\d{12}" + (prefs.cardnum ? prefs.cardnum : "\\d{4}$"), "i");
        realJSON = xml.accountlist.account,
        thisIsCart = '';

        console.log(cartNum);
    var newJSON = {};
    for (i in realJSON) { 
        newJSON[realJSON[i].accountno] = realJSON[i];
        if (cartNum.test(realJSON[i].accountno) && thisIsCart === '') { thisIsCart = realJSON[i].accountno; }
    }

    if (thisIsCart === '') { throw new AnyBalance.Error('Карты не найдены'); } 

    getParam(newJSON[thisIsCart].name, result, 'type', null, replaceTagsAndSpaces, html_entity_decode);
    getParam(newJSON[thisIsCart].expiry_date, result, 'expiryDate', null, replaceTagsAndSpaces, parseDate); // дата истечения срока
    getParam(newJSON[thisIsCart].holder_name, result, 'holderName', null, replaceTagsAndSpaces, html_entity_decode); // держатель карты
    
    var schets = newJSON[thisIsCart].text6.split("|"),
        schetStr = [];
    for (j in schets) {
        if (schets[j] != '') {
           schets[j] = schets[j].split(",");
           schetStr.push(schets[j]['1'] + "(" + schets[j]['0'] + ")");
        }
    }
    getParam(schetStr.join(", "), result, 'schet', null, replaceTagsAndSpaces, html_entity_decode); // счета

    html = AnyBalance.requestPost(baseurl + 'bankworld/ru/external/accounts/otb.bml', {BIType: 'CardOTB', BIXML: '<DOC><pan Value="' + thisIsCart + '"/></DOC>', correspondencetext: 'true'},addHeaders({'Referer': baseurl + 'bankworld/ru/external/cards.bml', 'X-Requested-With':'XMLHttpRequest' }, g_headers)); 

    getParam(html, result, 'availablebalance', /<balance>([\s\S]*?)<\/balance>/i, null, parseBalance); // доступный баланс
    getParam(newJSON[thisIsCart].currencycode, result, ['currencycode', 'availablebalance'], null, replaceTagsAndSpaces, null); // валюта

    AnyBalance.setResult(result);
}

