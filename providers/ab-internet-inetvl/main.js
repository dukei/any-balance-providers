/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для владивостокского интернет-провайдера АльянсТелеком

Сайт оператора: www.inetvl.ru
Личный кабинет: https://stat.inetvl.ru/
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://stat.inetvl.ru/";

    var html = AnyBalance.requestPost(baseurl + '/user/login/', {
        login_input:prefs.login,
        pwd_input:prefs.password,
        Enter: 'Войти'
    });

    //AnyBalance.trace(html);
    if(!/\/user\/logout/.test(html)){
        var error = getParam(html, null, null, /<div[^>]*class=["']validation-error[^>]*>([\s\S]*?)<\/div>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс лицевого счёта:[\S\s]*?<t[dh][^>]*>([\S\s]*?)<\/t[dh]>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'promise', /Незакрытый обещанный платеж:[\S\s]*?<t[dh][^>]*>([\S\s]*?)<\/t[dh]>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'promise_close', /Закрыть обещанный платёж до:[\S\s]*?<t[dh][^>]*>([\S\s]*?)<\/t[dh]>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'block', /Блокировка:[\S\s]*?[\S\s]*?<t[dh][^>]*>([\S\s]*?)<\/t[dh]>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', /Номер лицевого счета[\S\s]*?<t[dh][^>]*>([\S\s]*?)<\/t[dh]>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'bestpay', /Рекомендуемая предоплата:[\S\s]*?<t[dh][^>]*>([\S\s]*?)<\/t[dh]>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /Текущий тариф[\S\s]*?<t[dh][^>]*>([\S\s]*?)<\/t[dh]>/i, replaceTagsAndSpaces, html_entity_decode);
    
    AnyBalance.setResult(result);
}
