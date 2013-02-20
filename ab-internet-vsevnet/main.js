/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у всеволожского интернет провайдера Всевнет

Сайт оператора: http://vsevnet.ru
Личный кабинет: http://user.vsevnet.ru
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://user.vsevnet.ru/";

    var html = AnyBalance.requestPost(baseurl, {
	dogovor:prefs.login,
	password:prefs.password
    }, {Referer:baseurl});

    if(!/'#exit'/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]*id="dialog"[^>]*>([\S\s]*?)(?:<\/div>|Вернитесь назад)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Сайт изменен?");
    }

    var result = {success: true};

    getParam(html, result, 'agr', /<td[^>]*>Номер договора[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /<td[^>]*>Фамилия Абонента[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /<td[^>]*>Баланс счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'charge', /<td[^>]*>Ближайшее списание абонентской платы[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'status', /<td[^>]*>Интернет[\s\S]*?<td[^>]*>([\s\S]*?)(?:<\/div>|<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);

    getParam(html, result, '__tariff', /<td[^>]*>Тарифный план[\s\S]*?<td[^>]*>([\s\S]*?)(?:\||<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);

    getParam(html, result, 'trafficIn', /<td[^>]*>Потреблено трафика[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
    getParam(html, result, 'trafficOut', /<td[^>]*>Потреблено трафика[\s\S]*?<td[^>]*>(?:[\s\S](?!<\/td>))*?\/(\s*\d+[\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);

    AnyBalance.setResult(result);
}
