/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
    var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите идентификатор абонента!');
	checkEmpty(prefs.password, 'Введите пароль!');
    
	AnyBalance.setDefaultCharset('utf-8');
	var baseurl = "http://cabinet.telecom.mipt.ru/";
	
    var html = AnyBalance.requestPost(baseurl, {
        login:prefs.login,
        password:prefs.password
    });
	
    if(!/\/exit\//i.test(html)){
        var error = getParam(html, null, null, [/Информационное сообщение[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, /<div\s+id="error">([^<]*)/i], replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Личный кабинет изменился или проблемы на сайте.");
    }
	
    var result = {success: true};
	
    getParam(html, result, 'balance', /Состояние счёта:[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'dayslimit', /Предел дней:[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'moneylimit', /Предел денег:[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'fio', /Статистика абонента:[\s\S]*?<i[^>]*>([\S\s]*?)<\/i>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'id', /Идентификатор абонента:[\s\S]*?<td[^>]*>(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
	
    html = AnyBalance.requestGet(baseurl + "services/");
    getParam(html, result, '__tariff', /<th>Тариф<(?:[\s\S]*?<td[^>]*>){2}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'status', /<th>Статус<(?:[\s\S]*?<td[^>]*>){3}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Предел дней:[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	
    if(AnyBalance.isAvailable('trafficIn','trafficOut')){
        var now = new Date();
        html = AnyBalance.requestGet(baseurl + "stats/?from=01." + (now.getMonth()+1) + '.' + now.getFullYear() + "&to=" + now.getDate() + '.' + (now.getMonth() + 1) + '.' + now.getFullYear());
        getParam(html, result, 'trafficIn', /Входящий(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTraffic);
        getParam(html, result, 'trafficOut', /Исходящий(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTraffic);
    }
	
    AnyBalance.setResult(result);
}