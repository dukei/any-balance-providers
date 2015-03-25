/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

ПРОВАЙДЕР НЕ АКТУАЛЕН!
*/

function main(){
    throw new AnyBalance.Error("Провайдер неактуален. Для замены вы можете установить провайдер NetByNet, где уже реализована поддержка Мурманска.");

    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://stat.szkti.ru/";

    var html = AnyBalance.requestPost(baseurl, {
        user:prefs.login,
        pass:prefs.password
    });

    //AnyBalance.trace(html);

    if(!/logout/i.test(html)){
        var error = getParam(html, null, null, /<span[^>]+id="auth_wrong_data"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Личный кабинет изменился или проблемы на сайте.");
    }

    var result = {success: true};

    getParam(html, result, 'fio', /<th[^>]*personal_info_interval[^>]*>([\s\S]*?)<\/th>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', /<span[^>]*basic_account_number[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /<div[^>]*main_menu_info_card2_balance[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /<table[^>]*id="actual_services_table"[^>]*>(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'abon', /<table[^>]*id="actual_services_table"[^>]*>(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'usedinthismonth', /<table[^>]*id="actual_services_table"[^>]*>(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'pi', /<div[^>]+id="main_menu_info_card2_pi"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);


    AnyBalance.setResult(result);
}
