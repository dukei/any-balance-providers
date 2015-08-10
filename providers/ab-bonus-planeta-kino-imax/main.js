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

    if(!/signout/i.test(html)){
        var error = getParam(html, null, null, /<ul class="error-messages"><li>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    html = AnyBalance.requestGet(baseurl + 'Profile/Id'); 
    getParam(html, result, '__tariff', /<dt>(?:Регистрационный номер|Реєстраційний номер)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, html_entity_decode);

    html = AnyBalance.requestGet(baseurl + 'Profile/BonusBalance');
    getParam(html, result, 'balance', /<\/h1>[\s\S]*?<p>([\s\S]*?) (?:бонусов на вашем счете.|бонусів на вашому рахунку.)/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
