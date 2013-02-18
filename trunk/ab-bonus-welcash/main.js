/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию по бонусной карте для всей семьи Велика Кишеня

Сайт оператора: http://card.welcash.kiev.ua
Личный кабинет: http://card.welcash.kiev.ua/index.php?option=login
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    if(AnyBalance.getLevel() < 6)
        throw new AnyBalance.Error('Этот провайдер требует AnyBalance API 6+');

    AnyBalance.setOptions({forceCharset: 'windows-1251'});

    var baseurl = "http://card.welcash.kiev.ua/index.php?option=";

    var html = AnyBalance.requestPost(baseurl + 'logon', {
        card_number:prefs.login,
        card_key:prefs.password
    });

    if(!/option=exit/.test(html)){
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неверный номер карты или пароль?');
    }

    html = AnyBalance.requestGet(baseurl + 'my_card');

    var result = {success: true};

    getParam(html, result, 'balance', /(?:Текущий баланс|Поточний баланс):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'bonus', /(?:Сумма на бонусном счете|Сума на бонусному рахунку):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /(?:Прізвище iм'я по батькові|Фамилия Имя Отчество):[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'cardnum', /(?:Номер карты|Номер картки):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'level', /(?:Текущий уровень|Поточний рівень):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
