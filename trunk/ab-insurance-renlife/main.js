/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о договоре в системе Ренесанс Life & Pensions 

Operator site: http://www.renlife.com/
Личный кабинет: https://lifecabinet.renlife.com/
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://lifecabinet.renlife.com/";

    AnyBalance.setDefaultCharset('utf-8'); 
    AnyBalance.requestGet(baseurl + 'user/login', g_headers);

    var html = AnyBalance.requestPost(baseurl + 'user/login_check', {
        _username:prefs.login,
        _password:prefs.password
    }, addHeaders({Referer: baseurl + 'user/login'})); 


    if(!/\/logout/i.test(html)){
        var error = getParam(html, null, null, /<form[^>]*>\s*<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    var reg = {
        statusReg: new RegExp('<td[^>]*>\\s*<a[^>]*>\\d*' + (prefs.number ? prefs.number : '\\d*') + '<\/a>(?:[\\s\\S]*?<td[^>]*>){1}([\\s\\S]*?)<\/td>', "i"),
        tariffReg: new RegExp('<td[^>]*>\\s*<a[^>]*>\\d*' + (prefs.number ? prefs.number : '\\d*') + '<\/a>(?:[\\s\\S]*?<td[^>]*>){2}([\\s\\S]*?)<\/td>', "i"),
        beginReg: new RegExp('<td[^>]*>\\s*<a[^>]*>\\d*' + (prefs.number ? prefs.number : '\\d*') + '<\/a>(?:[\\s\\S]*?<td[^>]*>){3}([\\s\\S]*?)<\/td>', "i"),
        endReg: new RegExp('<td[^>]*>\\s*<a[^>]*>\\d*' + (prefs.number ? prefs.number : '\\d*') + '<\/a>(?:[\\s\\S]*?<td[^>]*>){4}([\\s\\S]*?)<\/td>', "i"),
        payPeriodReg: new RegExp('<td[^>]*>\\s*<a[^>]*>\\d*' + (prefs.number ? prefs.number : '\\d*') + '<\/a>(?:[\\s\\S]*?<td[^>]*>){5}([\\s\\S]*?)<\/td>', "i"),
        feeReg: new RegExp('<td[^>]*>\\s*<a[^>]*>\\d*' + (prefs.number ? prefs.number : '\\d*') + '<\/a>(?:[\\s\\S]*?<td[^>]*>){6}([\\s\\S]*?)<\/td>', "i"),
        indexFeeReg: new RegExp('<td[^>]*>\\s*<a[^>]*>\\d*' + (prefs.number ? prefs.number : '\\d*') + '<\/a>(?:[\\s\\S]*?<td[^>]*>){7}([\\s\\S]*?)<\/td>', "i"),
        datePayReg: new RegExp('<td[^>]*>\\s*<a[^>]*>\\d*' + (prefs.number ? prefs.number : '\\d*') + '<\/a>(?:[\\s\\S]*?<td[^>]*>){8}([\\s\\S]*?)<\/td>', "i"),
        debtFeeReg: new RegExp('<td[^>]*>\\s*<a[^>]*>\\d*' + (prefs.number ? prefs.number : '\\d*') + '<\/a>(?:[\\s\\S]*?<td[^>]*>){9}([\\s\\S]*?)<\/td>', "i"),
    };

    getParam(html, result, 'status', reg.statusReg, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', reg.tariffReg, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'dateBegin', reg.beginReg, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'dateEnd', reg.endReg, replaceTagsAndSpaces, parseDate);

    getParam(html, result, 'payPeriod', reg.payPeriodReg, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fee', reg.feeReg, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'indexFee', reg.indexFeeReg, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'datePay', reg.datePayReg, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'debtFee', reg.debtFeeReg, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
