/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию по бонусной программе Ulmart

Сайт оператора: http://ulmart.ru
Личный кабинет: http://www.ulmart.ru/cabinet/
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://www.ulmart.ru/";

    var html = AnyBalance.requestPost(baseurl + 'login.php', {
        login:prefs.login,
        pass:prefs.password
    });

    if(!/logout\.php/.test(html)){
        if(/<title>Ошибка<\/title>/i.test(html))
            throw new AnyBalance.Error("Неверный логин или пароль");
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /XXL-Бонус:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /<table[^>]+class="loggedBlock"[\s\S]*?<tr[^>]*>([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
