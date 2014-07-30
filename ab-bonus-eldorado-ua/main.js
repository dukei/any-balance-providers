/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Данные по бонусной карте Eldorado

Сайт магазина: http://eldorado.com.ua/
Личный кабинет: http://www.club.eldorado.com.ua/personal/
*/

function main(){
	var baseurl = 'http://www.club.eldorado.com.ua/personal/';
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('windows-1251');
        var headers = {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
        'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
        'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.153 Safari/537.36',
    };
    
    var html = AnyBalance.requestGet(baseurl, headers); //Установим сессию

    headers.Referer = baseurl;
   
    html = AnyBalance.requestPost(baseurl, {
        login: prefs.login,
        pin: prefs.pass,
	mail: prefs.email,
	gologin: 'Y'
    }, headers);

    
    if(!/Выход/i.test(html)){
    var error = getParam(html, null, null, /<div class="popup-inner">(?:\s*|\s*<p class='er_'>)([^<]*)(?:|<\/p>)\s*<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    //ФИО
    sumParam(html, result, '__tariff', /<td>Фамилия:<\/td>\s*<td><strong>([\s\S]*?)<\/strong><\/td>/ig, replaceTagsAndSpaces, html_entity_decode, create_aggregate_join(' '));
    sumParam(html, result, '__tariff', /<td>Имя:<\/td>\s*<td><strong>([\s\S]*?)<\/strong><\/td>/ig, replaceTagsAndSpaces, html_entity_decode, create_aggregate_join(' '));
    sumParam(html, result, '__tariff', /<td>Отчество:<\/td>\s*<td><strong>([\s\S]*?)<\/strong><\/td>/ig, replaceTagsAndSpaces, html_entity_decode, create_aggregate_join(' '));

    //Активная сумма
    getParam(html, result, 'balance', /<span class="num_new"\s?>([^<]*)<\/span>\s?<span class="ttext_">- Активных бонусов\s?<\/span>/i, replaceTagsAndSpaces, parseBalance);

    //НЕактивная сумма
    getParam(html, result, 'balance_not_active', /<span class="num_new"\s?>([^<]*)<\/span>\s?<span class="ttext_">- Не активных бонусов\s?<\/span>/i, replaceTagsAndSpaces, parseBalance);
    
    //Срок действия бонусов
    getParam(html, result, 'bonus_burn_date', /<td><span>Бонусы<\/span><\/td>\s*<td><span>Срок действия<\/span><\/td>\s*<\/tr>\s*<tr>\s*<td>[^<]*<\/td>\s*<td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    
    //Дата перевода бонусов
    getParam(html, result, 'bonus_active', /<td><span>Бонусы<\/span><\/td>\s*<td><span>В статус активный<\/span><\/td>\s*<\/tr>\s*<tr>\s*<td>[^<]*<\/td>\s*<td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    
    // Номер карты
    result.ncard = prefs.login;

    AnyBalance.setResult(result);

}
