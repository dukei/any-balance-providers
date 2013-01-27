/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для ТТК-Урал.

Сайт оператора: https://www.uralttk.ru
Личный кабинет: https://www.uralttk.ru/billing/login.php
*/

var g_baseurl = "https://www.uralttk.ru/billing/";
var g_headers = {
        'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
        'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
        'Cache-Control':'max-age=0',
        'Connection':'keep-alive',
        'Referer':g_baseurl,
        'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1312.56 Safari/537.17'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');

    if(prefs.num && !/^\d+$/.test(prefs.num))
        throw new AnyBalance.Error('Введите номер лицевого счета, по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому лицевому счету');

    var baseurl = g_baseurl;

    var html = AnyBalance.requestPost(baseurl + 'login.php', {
        login:prefs.login,
	password:prefs.password,
	authorize:'вход'
    }, g_headers);

    //AnyBalance.trace(html);
    if(!/login.php\?logout/i.test(html)){
        var error = getParam(html, null, null, /<td[^>]+class="message"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    html = AnyBalance.requestGet(baseurl + 'balance.php', g_headers);

    var result = {success: true};

    if(prefs.num){
        var select = getParam(html, null, null, /<select[^>]+name="active_account"[^>]*>([\s\S]*?)<\/select>/i);
        if(!select){
            AnyBalance.trace('Не удалось найти выбор лицевого счета. Сайт изменен?');
        }else{
            var re = new RegExp('<option[^>]*>\\s*' + prefs.num, 'i');
            var option = getParam(select, null, null, re);
            if(!option)
                throw new AnyBalance.Error('Не удалось найти лицевого счета №' + prefs.num);
            if(!/selected/i.test(option)){
                var val = getParam(option, null, null, /value="([^"]*)/i);
                AnyBalance.trace('Переключаемся на лицевой счет №' + prefs.num);
                html = AnyBalance.requestPost(baseurl + 'balance.php', {active_account: val}, g_headers);
            }
        }
    }

    //Последняя строчка. Что-то вроде Переплата на 27.01.2013	73.33 руб. или Задолжность на 31.12.2012  83.09 руб.
    getParam(html, result, 'balance', /<th[^>]*>\s*Лицевой счет(?:[\s\S](?!<\/table))*?<tr[^>]*>((?:[\s\S](?!<tr))*?)<\/tr>\s*<\/table>/i, [replaceTagsAndSpaces, /Переплата/ig, '', /на \d+\D\d+\D\d+/ig, '', /Задолже?н?ность/ig, '-'], parseBalance);
    getParam(html, result, 'licschet', /<select[^>]+name="active_account"[^>]*>(?:[\s\S](?!<\/select))*?<option[^>]+selected[^>]*>([\s\S]*?)<\/option>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'agreement', /<td[^>]*>\s*Договор([\S\s]*?)(?:<\/td>|<br)/i, replaceTagsAndSpaces, html_entity_decode);

    html = AnyBalance.requestGet(baseurl + 'change.php', g_headers);
    getParam(html, result, '__tariff', /<th[^>]*>\s*Тариф(?:[\S\s]*?<td[^>]*>){3}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    
    AnyBalance.setResult(result);
}
