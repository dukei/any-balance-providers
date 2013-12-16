/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для томского интернет-провайдера ИскраТелеком

Сайт оператора: http://iskratelecom.ru
Личный кабинет: https://my.istel.ru
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
	
    var baseurl = 'https://stat.seven-sky.net/cgi-bin/clients/';

    var html = AnyBalance.requestPost(baseurl + 'login', {
        action:'validate',
        login:prefs.login,
        password:prefs.password,
        domain_id:'1',
        submit:'Войти'
    });

    if(!/action=logout/.test(html)){
        var error = getParam(html, null, null, /<span[^>]*style=["']color:\s*#101010[^>]*>([\s\S]*?)<\/span>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Ваш баланс:[\S\s]*?<span[^>]*>([\S\s]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet', /Счет N([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    /*var sessid = getParam(html, null, null, /<input[^>]*name="session_id"[^>]*value="([^"]*)/i);

    html = AnyBalance.requestGet(baseurl + "deal_account?session_id=" + sessid + "&action=stat_user_show");

    getParam(html, result, '__tariff', /<td[^>]*class=['"]utm-cell[^>]*>([\S\s]*?)<\/t[dr]>/i, replaceTagsAndSpaces, html_entity_decode);
    var table = getParam(html, null, null, /Отчет о предоставленных пользователю услугах[\s\S]*?<table[^>]*>([\s\S]*?)<\/table>/i);
    if(table){
        var matches = table.match(/<tr>\s*<td>([^<]*)<\/td>/ig);
        var strs=[];
        for(var i=0; matches && i<matches.length; ++i){
            strs[strs.length] = getParam(matches[i], null, null, /<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        }
        if(strs.length){
            result.__tariff = strs.join(', ');
        }
    }
	*/
    AnyBalance.setResult(result);
}