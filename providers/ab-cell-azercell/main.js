/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11'};

function main(){
    var prefs = AnyBalance.getPreferences();
    var lang = prefs.lang || 'ru';
    var baseurl = "http://www.azercell.com/WebModule1/mainservlet";

    checkEmpty(prefs.login, 'Введите номер телефона (Логин)!');
    checkEmpty(prefs.password, 'Введите пароль!');

    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestPost(baseurl + '?lang=' + lang, {
        cmnd:'login',
        loginprefix:prefs.prefix,
        login:prefs.login,
        pw:prefs.password,
        Submit:'Принять'
    }, g_headers);

    if(!/cmnd=logout|<title>(?:Login ok|Giriş|Логин)<\/title>/i.test(html)){
        var error = getParam(html, null, null, /<font[^>]+color="#FF0000"[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error){
            throw new AnyBalance.Error(error, null, /Некорректный логин или пароль|login or password is invalid|adınız və ya şifrəniz düzgün deyildir/i.test(error));
        }
        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Сайт изменен?");
    }

    var html = AnyBalance.requestGet(baseurl + '?cmnd=checkbalance', g_headers);
    
    var result = {success: true};
    if(AnyBalance.isAvailable('debt', 'advance', 'calls', 'limit', 'paytill', 'phone')){
        //Сумма долга|Billed amount|Faktura borcu
        getParam(html, result, 'debt', /(?:&#x0421;&#x0443;&#x043C;&#x043C;&#x0430; &#x0434;&#x043E;&#x043B;&#x0433;&#x0430;|Billed amount|Faktura borcu)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        //Сумма аванса|Advance payment|Avansınız
        getParam(html, result, 'advance', /(?:&#x0421;&#x0443;&#x043C;&#x043C;&#x0430; &#x0430;&#x0432;&#x0430;&#x043D;&#x0441;&#x0430;|Advance payment|Avans&#305;n&#305;z)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        //Сумма текущих разговоров|Unbilled amount|Kəsilməmiş faktura məbləği
        getParam(html, result, 'calls', /(?:&#x0421;&#x0443;&#x043C;&#x043C;&#x0430; &#x0442;&#x0435;&#x043A;&#x0443;&#x0449;&#x0438;&#x0445; &#x0440;&#x0430;&#x0437;&#x0433;&#x043E;&#x0432;&#x043E;&#x0440;&#x043E;&#x0432;|Unbilled amount|K&#601;silm&#601;mi&#351; faktura m&#601;bl&#601;&#287;i)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        //Оставшийся лимит|Credit Remaining|Qalıq limitiniz
        getParam(html, result, 'limit', /(?:&#x041E;&#x0441;&#x0442;&#x0430;&#x0432;&#x0448;&#x0438;&#x0439;&#x0441;&#x044F; &#x043B;&#x0438;&#x043C;&#x0438;&#x0442;|Credit Remaining|Qal&#305;q limitiniz)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        //Срок оплаты|Due date|Son ödəmə tarixi
        getParam(html, result, 'paytill', /(?:&#x0421;&#x0440;&#x043E;&#x043A; &#x043E;&#x043F;&#x043B;&#x0430;&#x0442;&#x044B;|Due date|Son &#246;d&#601;m&#601; tarixi)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDateISO);
        //Номер|GSM No|Nömrə
        getParam(html, result, 'phone', /(?:Номер|GSM No|N&ouml;mr&#601;):([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
    }

    html = AnyBalance.requestGet(baseurl + '?cmnd=postrateplan', g_headers);
    getParam(html, result, '__tariff', /(?:Ваш текущий тарифный план|Your current tariff package is|Cari tarif planınız):([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('bonus')){
        html = AnyBalance.requestGet(baseurl + '?cmnd=loyalty_list', g_headers);
        getParam(html, result, 'bonus', /(?:Ваш баланс:|Your balance is|Balansınız:)([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
    }

    if(AnyBalance.isAvailable('paysum', 'paydate')){
        html = AnyBalance.requestGet(baseurl + '?cmnd=prepayments', g_headers);
        getParam(html, result, 'paydate', /<td[^>]*>\s*(?:Сумма|Amount|Məbləğ)(?:(?:[\s\S](?!<\/table))*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDateISO);
        getParam(html, result, 'paysum', /<td[^>]*>\s*(?:Сумма|Amount|Məbləğ)(?:(?:[\s\S](?!<\/table))*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }

    AnyBalance.setResult(result);
}
