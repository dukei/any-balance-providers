/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    
    var baseurl = "https://issa.volgogsm.ru/cgi-bin/cgi.exe?";
//    var baseurl = "https://80.69.146.12/issa/cgi-bin/cgi.exe?";

    AnyBalance.trace("Trying to enter issa at address: " + baseurl + "function=is_login");
    var html = AnyBalance.requestPost(baseurl + "function=is_login", {
        mobnum: prefs.login,
        Password: prefs.password
    });
    
	if (/Войдите в систему ещё раз|Ошибка аутентификации/i.test(html)) {
		var error = getParam(html, null, null, [/<table[^>]+class=['"]?centorize-td[^>]*>([\s\S]*?)<\/tr>/i, /class=error[^>]*>([^<]+)/i], replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /неверный пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + "function=is_account");
	
    var result = {success: true};
	
	getParam(html, result, 'ActualBalance', /Актуальный баланс:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'DayRashod', /Средняя скорость расходования средств по лицевому счету в день:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'BonusBalance', /Количество бонусных баллов на счету:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'MinBalabce', /Минимальный баланс для подключения:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'DateOff', /Предположительная дата отключения без поступления средств менее, чем через:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
    sumParam(html, result, 'sms', [/остаток Бонус (?:&quot;|")\d+ SMS(?:&quot;|") составляет (\d+) SMS/i,/у Вас остаток (\d+) для услуги Бонус (?:&quot;|")\d+ SMS(?:&quot;|")/i,/остаток\s+лимита\s+составляет([\s\d]+)SMS/i], replaceTagsAndSpaces, parseBalance, aggregate_sum);
    sumParam(html, result, 'min', [/накоплено исходящий трафик составляет (\d+) мин/i,/остаток\s+лимита\s+составляет([\s\d]+)мин/i], replaceTagsAndSpaces, parseBalance, aggregate_sum);
	
	var traficStr = getParam(html, null, null, /лимита\s+GPRS\s+Остаток([^<]+Б)/i);
	if(traficStr) {
		// мы получили строку вида: 1 ГБ 9 MБ 208 KБ 0 Б 
		var traf = sumParam(traficStr, null, null, /([\s\d]+(?:М|M|K|К|Г|G)?(?:B|Б))/ig);
		for(var i = 0; i < traf.length; i++) {
			var current = traf[i];
			sumParam(current, result, 'trafic', null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
		}
	}
	
    getParam(html, result, '__tariff', /issa\/tariff\.gif[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode); 
    
    AnyBalance.setResult(result);
}