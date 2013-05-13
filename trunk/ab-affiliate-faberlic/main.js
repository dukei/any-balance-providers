/**
Фаберлик (http://any-balance-providers.googlecode.com)

Получает информацию из личного кабинета сайта компании Фаберлик

Operator site: https://faberlic.com/
Личный кабинет: https://faberlic.com/index.php?option=com_user&view=login&lang=ru
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

    var baseurl = "https://faberlic.com/";

    AnyBalance.setDefaultCharset('UTF-8'); 

    AnyBalance.requestGet("https://faberlic.com/index2.php?option=com_module&module=flregionselection&no_html=1&task=getmodule&act=setRegion&reg_id=1000034185667");
    
    var html = AnyBalance.requestGet(baseurl + 'index.php?option=com_user&view=login&lang=ru', g_headers);

    var form = getParam(html, null, null, /<form[^>]+id="com-form-login"[^>]*>([\s\S]*?)<\/form>/i);    
    if(!form)
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');

    var params = createFormParams(form);
    params['username'] = prefs.login;
    params['passwd'] = prefs.password;

    html = AnyBalance.requestPost(baseurl + 'index.php?option=com_user&view=login&lang=ru', params, addHeaders({Referer: baseurl + 'index.php?option=com_user&view=login&lang=ru'})); 

    var meta = getParam(html, null, null, /<meta[^>]+http-equiv="refresh"[^>]+content="0;([\s\S]*?)\"/i, replaceTagsAndSpaces, html_entity_decode);
    console.log(meta);
    html = AnyBalance.requestGet(meta, g_headers);     

    if(!/logout-link/i.test(html)){
        var error = getParam(html, null, null, /<dd[^>]+class="error message fade"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'fio', /<div[^>]+class="userscaption"[^>]*><a[^>]*>([\s\S]*?)-/i, replaceTagsAndSpaces, html_entity_decode);
    //мой счет
    getParam(html, result, 'balance', /<div[^>]+class="block-myaccount"[^>]*>(?:[\s\S]*?<div[^>]+class="mod-ourorders-famount"[^>]*>){1}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    // моя ОС
    getParam(html, result, 'myOS', /<div[^>]+class="block-myaccount"[^>]*>(?:[\s\S]*?<div[^>]+class="mod-ourorders-famount"[^>]*>){2}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    // К оплате
    getParam(html, result, 'payable', /<div[^>]+class="block-myaccount"[^>]*>(?:[\s\S]*?<div[^>]+class="mod-ourorders-famount"[^>]*>){3}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    // ближайщая доставка
    getParam(html, result, 'delivery', /Ближайшая доставка<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    // консультант
    getParam(html, result, 'consultant', /<td[^>]*>\s*Текущий период\s*<\/td>(?:[\s\S]*?<td[^>]*>){2}[\s\S]*?<span[^>]+class="red"[^>]*>\s*-([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    // ЛО
    getParam(html, result, 'LO', /<td[^>]*>\s*Текущий период\s*<\/td>(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    // ОЛГ
    getParam(html, result, 'OLG', /<td[^>]*>\s*Текущий период\s*<\/td>(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    // ГО
    getParam(html, result, 'GO', /<td[^>]*>\s*Текущий период\s*<\/td>(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    

    AnyBalance.setResult(result);
}
