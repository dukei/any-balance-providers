/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у черкасского оператора интернет McLaut 

Сайт оператора: http://mclaut.com
Личный кабинет: https://bill.mclaut.com (закрыт для доступа извне)
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://bill.mclaut.com/index.php";

    var html = AnyBalance.requestPost(baseurl + '?module=SYS_users&func=login', {
        login:'Вход',
        user_name:prefs.login,
        user_pass:prefs.password
    });

    if(!/Вход выполнен/i.test(html)){
        var error = getParam(html, null, null, /403 Forbidden/i);
        if(error)
            throw new AnyBalance.Error('Личный кабинет доступен только из сети McLaut. Установите WiFi соединение с домашним роутером.');
        error = getParam(html, null, null, /<span[^>]*style="[^"]*bold[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + '?module=SYS_users');

    var href = getParam(html, null, null, /<a[^>]+href="\/index.php([^"]*client_view[^"]*)/i, null, html_entity_decode);
    if(!href)
        throw new AnyBalance.requestGet('Не удаётся найти ссылку на информацию. Сайт изменен?');

    html = AnyBalance.requestGet(baseurl + href);

    var result = {success: true};

    getParam(html, result, 'status', /<td[^>]*>\s*Активен[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /<td[^>]*>\s*Имя[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', /Номер лицевого счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /<td[^>]*>\s*Баланс[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, function(str){var val = parseBalance(str); return val && Math.round(val*100)/100;});
    getParam(html, result, '__tariff', /Пользователи клиента(?:(?:[\s\S](?!<\/table>))*?<td[^>]*>){15}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
