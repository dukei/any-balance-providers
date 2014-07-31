/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Оператор экспресс-доставки «Нова пошта»
Сайт оператора: http://novaposhta.ua
*/

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = 'https://my.novaposhta.ua/';

    AnyBalance.trace("Trying to enter selfcare at address: " + baseurl + '?r=auth/index');
    var html = AnyBalance.requestPost(baseurl + '?r=auth/index', {
    	"LoginForm[username]": prefs.email,
        "LoginForm[password]": prefs.passw
    });

    var result = {success: true};

    if(!/Налаштування/i.test(html)){

    var error = getParam(html, null, null, /<div class="errorSummary">\s*<ul>\s*<li>([\s\S]*)<\/li>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestPost(baseurl + '?r=loyaltyUser/index');

    // ФИО
    getParam(html, result, '__tariff', /<th>Власник:<\/th>\s*<td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    // Номер карты
    getParam (html, result, 'ncard', /<th>Номер картки лояльності:<\/th>\s*<td>(\d+)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    html = AnyBalance.requestPost(baseurl + '?r=loyaltyUser/turnover');

    // Балы
    sumParam (html, result, 'balance', /<th>Залишок балів:<\/th>\s*<td>(\d+)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    sumParam (html, result, 'balance_all', /<th>Всього балів:<\/th>\s*<td>(\d+)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);

    // Скидка
    sumParam (html, result, 'discount', /<th>Доступна знижка, грн.:<\/th>\s*<td>(\d+.\d+)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);

    // Кол-во отправок
    sumParam (html, result, 'send', /<th>Кількість ТТН:<\/th>\s*<td>(\d+)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);

    // Статус
    getParam (html, result, 'status', /<th>Статус Учасника:<\/th>\s*<td>([^<]*)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam (html, result, 'status_next', /<th>Наступний статус:<\/th>\s*<td>([^<]*)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);

}
