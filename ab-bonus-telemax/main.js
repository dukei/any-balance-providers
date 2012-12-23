/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию по бонусной программе "Телемакс-Бонус" от магазина Телемакс.

Сайт оператора: http://www.telemaks.ru/
Личный кабинет: http://www.telemaks-bonus.ru/
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://www.telemaks-bonus.ru/";

    var html = AnyBalance.requestPost(baseurl, {
        x:23,
        y:6,
        login:prefs.login,
        password:prefs.password,
        act:'login'
    });

    //AnyBalance.trace(html);
    if(!/push\/exit\.gif/.test(html)){
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неправильный номер карты или пароль.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Количество бонусов:([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet', /Ваш номер карты:([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Ваш номер карты:([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
