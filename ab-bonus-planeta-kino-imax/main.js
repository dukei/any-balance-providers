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
    AnyBalance.setDefaultCharset('windows-1251'); 

    html = AnyBalance.requestPost(baseurl + '?return=#in', {
        'return':'',
        '__signing_l':prefs.login,
        '__signing_p':prefs.password,
        '__signing_action':'signin',
        '__signing_in':'Âîéòè'
    }); 

    if(!/\/signout\//i.test(html)){
        var error = getParam(html, null, null, /<ul class="error-messages"><li>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    html = AnyBalance.requestGet(baseurl + 'profile/id/'); 
    getParam(html, result, '__tariff', /<dt>(?:Номер карты лояльности|Номер картки лояльності)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, html_entity_decode);

    html = AnyBalance.requestGet(baseurl + 'profile/bonus-balance/'); 
    getParam(html, result, 'balance', /(?:На вашем счете|На вашому рахунку) ([\s\S]*?) бонус./i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
