/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс бонусных миль для французкой авиакомпании airfrance

Operator site: https://www.airfrance.ru
Личный кабинет: https://www.airfrance.ru
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function createParams(params){
    var str = '';
    for(var param in params){
        str += str ? '&' : '?';
        str += encodeURIComponent(param);
        str += '=';
        str += encodeURIComponent(params[param]);
    }
    return str;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://www.airfrance.ru/";
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'RU/ru/common/home/home/HomePageAction.do', g_headers);

    //Находим секретный параметр
    var session = getParam(html, null, null, /var\s+Session\s*=\s*'([^']*)/i, replaceSlashes);
    if(!session) //Если параметр не найден, то это, скорее всего, свидетельствует об изменении сайта или о проблемах с ним
        throw new AnyBalance.Error('Could not find session identifier. Is the site changed?');
    var a = session.split(':');
    var sid = a[0], engineid = a[1];

    //Теперь, когда секретный параметр есть, можно попытаться войти
    html = AnyBalance.requestPost(baseurl + 'ams/account/signInFromAF.htm', {
        type:'mya-auth',
        carrier:'AF',
        lang:'ru',
        country:'RU',
        profileHome:'https://www.airfrance.ru/RU/ru/common/personnalisation/nonloggue/modifierMonAirfranceFFPSecurise.do',
        siteHome:'https://www.airfrance.ru/RU/ru/common/home/home/HomePageAction.do',
        sessionID:sid,
        engineID:engineid,
        userId:prefs.login,
        password:prefs.password
    }, addHeaders({'X-Requested-With': 'XMLHttpRequest', Referer: baseurl + 'RU/ru/common/home/home/HomePageAction.do'})); 

    //После входа обязательно проверяем маркер успешного входа
    //Обычно это ссылка на выход, хотя иногда приходится искать что-то ещё
    if(!/callbackSuccess/i.test(html)){
        throw new AnyBalance.Error('Cound not enter the site. Have you entered correct login and password?');
    }

    html = AnyBalance.requestGet(baseurl + 'RU/ru/local/myaccount/LoadProfileMyAccountAction.do', g_headers);

    var result = {success: true};
    getParam(html, result, 'fio', /<lastname>([\s\S]*?)<\/lastname>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'num', /<number>([\s\S]*?)<\/number>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /<identity>([\s\S]*?)<\/identity>/i, [/&amp;/ig, '&', /&#(\d+);/g, replaceCharsFunc, replaceTagsAndSpaces], html_entity_decode);
    getParam(html, result, 'balance', /<solde>([\s\S]*?)<\/solde>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'level', /<level>([\s\S]*?)<\/level>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'lastop', /<lastOperation>([\s\S]*?)<\/lastOperation>/i, replaceTagsAndSpaces, parseDate);

    //Возвращаем результат
    AnyBalance.setResult(result);
}

function replaceCharsFunc(str, code){
    return String.fromCharCode(+code);
}