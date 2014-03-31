/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для украинского интернет-провайдера IPNET

Сайт оператора: http://ipnet.ua
Личный кабинет: https://stat.ipnet.ua/
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
	
    if(AnyBalance.getLevel() < 5)
        throw new AnyBalance.Error('Для этого провайдера необходима AnyBalance v.2.9.600+.');
	
    var baseurl = "https://stat.ipnet.ua/";
	
    var html = AnyBalance.requestGet(baseurl);
    var url = AnyBalance.getLastUrl();
	
    var html = AnyBalance.requestPost(url, {
        login:prefs.login,
        password:prefs.password,
        'auth.x': 63,
        'auth.y': 12
    });
	
    if(!/logout/.test(html)){
        var error = getParam(html, null, null, /<font[^>]*color=["']?red[^>]*>([\s\S]*?)<\/font>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }
	
    var result = {success: true};
	
    getParam(html, result, 'balance', /Текущий остаток[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'till', /Прогнозируемая дата ухода в минус[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'status', /Текущее состояние[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'agreement', /Номер договора[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Тарифный пакет[\S\s]*?<td[^>]*center">([\S\s]*?)<\/t[dr]>/i, replaceTagsAndSpaces, html_entity_decode);
    
    AnyBalance.setResult(result);
}