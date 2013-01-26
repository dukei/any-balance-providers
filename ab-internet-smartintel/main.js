/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для подмосковного провайдера smartintel.

Сайт оператора: http://smartintel.ru/
Личный кабинет: https://stat.smartintel.ru
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('UTF-8');

    var baseurl = "https://stat.smartintel.ru/";

    var html = AnyBalance.requestPost(baseurl + 'login_user.htms', {
        LOGIN:prefs.login,
        PASSWD:prefs.password,
        URL:'stat.smartintel.ru',
        domain:'',
        subm:'Вход'
    });

    //AnyBalance.trace(html);
    if(!/logout_user\.htms/i.test(html)){
        var error = getParam(html, null, null, /<td[^>]+class="message"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Остаток(?:&nbsp;|\s)*:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet', /Лицевой счет N([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'agreement', /<td[^>]*>Договор N[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /Название организации[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Название организации[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('status')){
        html = AnyBalance.requestGet(baseurl + 'main.htms?type=tech');
        getParam(html, result, 'status', /<td[^>]*>Учетные имена(?:(?:[\S\s](?!<\/table))*?<td[^>]*>){2}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    }
    
    AnyBalance.setResult(result);
}
