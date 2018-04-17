/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Предоставляет информацию о бонусном счете сети кинотеатров «Планета кино»

Сайт: http://planeta-kino.com.ua/
Личный кабинет: https://cabinet.planeta-kino.com.ua/
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
    var baseurl = "https://cabinet.planeta-kino.com.ua/";
//    AnyBalance.setDefaultCharset('windows-1251'); 
    AnyBalance.setDefaultCharset('utf-8'); 

    html = AnyBalance.requestPost(baseurl + 'Account/Login?ReturnUrl=%2f', {
        'login':prefs.login,
        'password':prefs.password
    }); 

    if(!/bonus_size/i.test(html)){
        var error = getElement(html, /<div[^>]+login-error/i, [/&nbsp(?!;)/g, '&nbsp;', replaceTagsAndSpaces]);
        if(error)
            throw new AnyBalance.Error(error, null, /знайшли|нашли|Парол/i.test(error));
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'balance', /<div[^>]+bonus_size[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);

    html = AnyBalance.requestGet(baseurl + 'Profile/Id'); 
    getParam(html, result, '__tariff', /(?:Регистрационный номер|Реєстраційний номер)[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}
