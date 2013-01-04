/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс для амурского поставщика электроэнергии Энергокомфорт Амур

Сайт оператора: http://www.amurcomsys.ru/
Личный кабинет: http://info.amurcomsys.ru
*/

var g_headers = {
  'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
  'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
  'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Intel Mac OS X 10.6; rv:7.0.1) Gecko/20100101 Firefox/7.0.1',
  Connection: 'keep-alive'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');

    var baseurl = "http://info.amurcomsys.ru/";

    var parts = /^(\d{5})(\d{3})(\d{2})$/.exec(prefs.login);

    var html = AnyBalance.requestPost(baseurl + 'epdinfo/login', {
        ehm_nme:prefs.login,
        ehm_sec:prefs.password,
        submit:'Продолжить'
    }, g_headers);

    //Выход из кабинета
    if(!/action="logoff"/i.test(html)){
        var error = getParam(html, null, null, /<\/form>\s*<p[^>]*>\s*<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неправильный номер счета или пароль?');
    }

    var result = {success: true};

    replaceTagsAndSpaces.push(/задолж\./ig, '-');

    getParam(html, result, 'balance', /<th[^>]*>На конец(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'agreement', /Код плательщика:(?:[\s\S]*?<div[^>]*class="val"[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /Владелец:(?:[\s\S]*?<div[^>]*class="val"[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /<th[^>]*>Эл-во(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<(?:br|\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'lastdate', /Оплаты(?:(?:[\s\S](?!<\/table>))*?<td[^>]*>){1}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'lastsum', /Оплаты(?:(?:[\s\S](?!<\/table>))*?<td[^>]*>){2}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}