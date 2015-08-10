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

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://www.britishairways.com/";

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'travel/loginr/public/ru_ru');

    var eId = getParam(html, null, null, /<input[^>]+name="eId"[^>]+value=\"([\s\S]*?)\"[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
	//alert(eId);
    html = AnyBalance.requestPost(baseurl + 'travel/loginr/public/ru_ru?eId=' + eId, {
        Directional_Login:'/travel/echome/execclub/_gf/ru_ru',
        membershipNumber:prefs.login,
        password:prefs.password
    }, addHeaders({Referer: baseurl + 'travel/echome/execclub/_gf/ru_ru'})); 

    if(!/execPnlLogout/i.test(html)){
        var error = getParam(html, null, null, /<span[^>]+class="errorTitle"[^>]*>Error<\/span>[\s\S\]*<div[^>]+class="podBody"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Can`t login into personal account. Maybe the site has changed??');
    }

    var result = {success: true};
    getParam(html, result, 'fio', /id="welcomeLabel"[^>]*>[\s\S]*?,\s*([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /"aviosPoints"[^>]*>([\s\S]*?)<\/h2>/i, [/,/, '', replaceTagsAndSpaces], parseBalance);
    getParam(html, result, 'balanceFamaly', /Баллы Avios на Семейном Счете:(?:[\s\S]*?<h3[^>]*>){1}([\s\S]*?)<\/h3>/i, [/,/, '', replaceTagsAndSpaces], parseBalance);
    getParam(html, result, 'balanceStatus', /Tier Points:(?:&nbsp;|\s)*([,\d]+)/i, [/,/, '', replaceTagsAndSpaces], parseBalance);
	
    getParam(html, result, 'cartType', /<h4[^>]+class="tierH4Style headingDisp"[^>]*>([\s\S]*?)<\/h4>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'yearEnd', /<table[^>]+summary="Мои Статусные Баллы"[^>]*>(?:[\s\S]*?<td[^>]*>){4}\s*<strong>([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'cartEnd', /<table[^>]+summary="Мои Статусные Баллы"[^>]*>(?:[\s\S]*?<td[^>]*>){6}\s*<strong>([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}
