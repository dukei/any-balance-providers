/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию по бонусной программе Плюс

Сайт оператора: http://plusbp.ru/
Личный кабинет: http://plusbp.ru/
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://plusbp.ru/";

    var html = AnyBalance.requestPost(baseurl, {
        name:prefs.login,
        pass:prefs.password,
        submit:'Войти'
    });

    //AnyBalance.trace(html);
    if(!/\?status=quit/.test(html)){
        var error = getParam(html, null, null, /<div[^>]*class=["']cabinetform_error[^>]*>([\s\S]*?)<\/div>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /На вашем счете:([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet', /Номер счета:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces);
    getParam(html, result, 'status', /Статус счета:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces);
    getParam(html, result, 'userName', /Ф.И.О.:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /Ф.И.О.:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces);
    getParam(html, result, 'gained', /Накоплено бонусных рублей:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'spent', /Израсходовано бонусных рублей:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
