/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function getMyJson(info){
    try{
        var json = new Function('return ' + info)();
        return json;
    }catch(e){
        AnyBalance.trace('Неверный json: ' + info);
        throw new AnyBalance.Error('Неверный ответ сервера!');
    } 
}

function findParam(params, name){
    for(var i=0; i<params.length; ++i){
        if(params[i][0] == name)
            return i;
    }
    return -1;
}

function createSignedParams(params, arData) {
    var key = new rsasec_key(arData.key.E, arData.key.M, arData.key.chunk);
    var data = '__RSA_RAND=' + arData.rsa_rand;

    for(var i = 0; i < arData.params.length; i++)
    {
                var param = arData.params[i];
                var idx = findParam(params, param);
        if(idx >= 0)
        {
            data += '&' + param + '=' + encodeURIComponent(params[idx][1]);
                        params[idx] = undefined;
        }
    }
    data = data + '&__SHA=' + SHA1(data);

    params.push(['__RSA_DATA', rsasec_crypt(data, key)]);

        var out = [];
        for(var i=0; i<params.length; ++i){
            var p = params[i];
            if(!p) continue;
            out.push(encodeURIComponent(p[0]) + '=' + encodeURIComponent(p[1]));
        }
        return out.join('&');
}

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "http://www.avtomir.ru/";

    AnyBalance.setDefaultCharset('utf-8'); 

    var info = AnyBalance.requestGet(baseurl + 'personal/', g_headers);
    var rsainfo = getParam(info, null, null, /top.rsasec_form_bind\)\s*\((\{'formid':'form_auth'[^)]*\})\)/);

    if(!rsainfo){
        var error = getParam(info, null, null, /<h2[^>]+style="color:\s*#933"[^>]*>([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не найдены ключи шифрования пароля. Сайт изменен, обратитесь к автору провайдера.');
    }

    rsainfo = getMyJson(rsainfo);
    
    console.log(rsainfo);

     var html = AnyBalance.requestPost(baseurl + "personal/?login=yes", createSignedParams([
        ['AUTH_FORM','Y'],
        ['TYPE','AUTH'],
        ['backurl','/personal/'],
        ['USER_LOGIN', prefs.login],
        ['USER_PASSWORD', prefs.password],
        ['Login','Войти']
    ], rsainfo), addHeaders({'Content-Type': 'application/x-www-form-urlencoded', Referer: baseurl + 'personal/'}));

    if(!/\?logout=yes/i.test(html)){
        var error = getParam(html, null, null, /<font[^>]+class="errortext"[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
        if(!error)
            error = getParam(html, null, null, /<h2[^>]+style="color:\s*#933"[^>]*>([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'fio', /<div[^>]+class="b_private_cab_info"[^>]*>\s*<p[^>]*>([\s\S]*?)<br>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'phone', /div[^>]+class="b_private_cab_info"[^>]*>\s*<p[^>]*>[^<]*[\s\S]*?<br>([\s\S]*?)<br>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Общая сумма баллов:([\s\S]*?)<br>/i, replaceTagsAndSpaces, parseBalance);
    getParam(prefs.login, result, 'number', null, replaceTagsAndSpaces, html_entity_decode);

    html = AnyBalance.requestGet(baseurl + "personal/transactions/", g_headers);

    getParam(html, result, 'dateLast', /Дата транзакци(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'regionLast', /Дата транзакци(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'typeLast', /Тип операции(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'sumLast',  /Сумма сделки(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, ['sumCurrencyLast', 'sumLast'],  /Сумма сделки(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(html, result, 'balanceLast',  /Начислено \/ Списано баллов(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
