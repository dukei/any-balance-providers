/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Оператор экспресс-доставки «Нова пошта»
Сайт оператора: http://novaposhta.ua
Личный кабинет: http://novaposhta.ua/loyalty/dashboard
*/

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = 'http://orders.novaposhta.ua/account/login/';

    AnyBalance.trace("Trying to enter selfcare at address: " + baseurl);
    var html = AnyBalance.requestPost(baseurl, {
    	a: prefs.login,
        n: prefs.passw
    });

    var result = {success: true};
    
    // Номер карты
    sumParam(html, result, '__tariff', /Всі документи по картці (\d+)<br>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);

    // Баланс
    sumParam (html, result, 'balance', /Загальна кількість балів на рахунку\s*<\/td>\s*<td class="[^<]*">\s*(\d+)\s*<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);

    // Количество отправок
    sumParam (html, result, 'send', /Кількість відправок:\s*<\/td>\s*<td class="[^<]*">\s*(\d+)\s*<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);


    AnyBalance.setResult(result);

}
