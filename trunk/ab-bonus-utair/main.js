/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию по бонусной карте UTair

Сайт оператора: http://utair.ru
Личный кабинет: https://ffp.utair.ru/css/index.action
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://ffp.utair.ru/css/";

    var html = AnyBalance.requestPost(baseurl + 'CssLogin.action?request_locale=ru', {
        username:prefs.login,
        password:prefs.password
    });

    if(!/CssLogout.action/.test(html)){
        var error = getParam(html, null, null, /<font[^>]*color="red"[^>]*>([\s\S]*?)<\/font>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /<strong[^>]*>([^<]*)<\/strong>\s*Наградные мили/i, replaceTagsAndSpaces, parseBalance);
    if(AnyBalance.isAvailable('balance') && !isset(result.balance))
        getParam(html, result, 'balance', /<td[^>]*>Состояние счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    getParam(html, result, '__tariff', /<td[^>]*>(?:Вид программы|Уровень участия)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'cardnum', /Номер карты[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

	getParam(html, result, 'miles_thisyear', /<strong>([\s\S]{1,100})Статусные мили в текущем году/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'miles_lastyear', /<strong>([\s\S]{1,100})Статусные мили в прошлом году/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'miles_to_erase', /<strong>([\s\S]{1,100})Наградые мили к следующему аннулированию/i, replaceTagsAndSpaces, parseBalance);
	
	getParam(html, result, 'miles_to_erase_date', /Наградые мили к следующему аннулированию([\s\S]{1,20})/i, replaceTagsAndSpaces, parseDate);
	
	
	
	
	
    AnyBalance.setResult(result);
}
