/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для московского интернет-провайдера ЭНЛАИН

Сайт оператора: http://www.nline.ru
Личный кабинет: https://www.nline.ru/cabineti
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://nline.ru/cabineti/";

    var html = AnyBalance.requestPost(baseurl + 'index.cgi?login', {
        prefix:'005',
        login:prefs.login,
        password:prefs.password
    });

    var number = getParam(html, null, null, /005 номер:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces);
    if(!number){
        //AnyBalance.trace(html);
        var error = getParam(html, null, null, /alert\s*\(\s*'([^']*)/, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /парол/i.test(error));
        
        html = AnyBalance.requestGet(baseurl + 'index.cgi');

        var number = getParam(html, null, null, /005 номер:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces);
        if(!number)
            throw new AnyBalance.Error('Не удалось войти в личный кабинет. Пустой логин-пароль, проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Остаток средств на счете:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet', /005 номер:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'agreement', /Номер договора:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /Текущий тариф:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'traffic', /Общий трафик:[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
    
    AnyBalance.setResult(result);
}