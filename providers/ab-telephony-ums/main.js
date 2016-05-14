/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://ip.ums.uz/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер телефона, без кода!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'selfcare/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
    var viewstate = getParam(html, null, null, /"__VIEWSTATE"[^>]*value="([^"]+)/i);
    var viewstate_gen = getParam(html, null, null, /"__VIEWSTATEGENERATOR"[^>]*value="([^"]+)/i);
    
	html = AnyBalance.requestPost(baseurl + 'selfcare/', {
        '__VIEWSTATE': viewstate,
        '__VIEWSTATEGENERATOR': viewstate_gen,
        'ctl00$MainContent$tbPhoneNumber': prefs.login,
        'ctl00$MainContent$tbPassword': prefs.password,
        'ctl00$MainContent$btnEnter': 'Войти'
	}, addHeaders({Referer: baseurl + 'selfcare/'}));
	
	if (!/logoff/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="logon-result-block"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /неизвестный номер телефона|неверный пароль|пароль не установлен или не действителен/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /баланс:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /баланс:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'fio', /<h3>([^]+)<\/h3>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Тарифный план:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'phone', /Номер:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'acc', /Лицевой счет:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', /lock-status(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    
	if(isAvailable(['traffic', 'minutes', 'minutes_net', 'traffic2', 'traffic2_till', 'sms'])) {
		html = AnyBalance.requestGet(baseurl + 'selfcare/account-status.aspx', g_headers);

		var status = getElement(html, /<ul[^>]+account-status[^>]*>/i);
		var items = getElements(status, /<li[^>]*>/ig);
		for(var i=0; i<items.length; ++i){
			var opt = items[i], matches;
			AnyBalance.trace('Разбираем ' + opt);
			if(matches = /(?:У Вас осталось|U Vas ostalos|Sizda)([^<]+mb)[^<]+(?:Действует до|Dejstvuet do|Amal qilish muddati)([^<]*)/i.exec(opt)){
				sumParam(matches[1], result, 'traffic2', null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
				sumParam(matches[2], result, 'traffic2_till', null, replaceTagsAndSpaces, parseDate, aggregate_min);
			}else if(matches = /(?:У Вас осталось|U Vas ostalos)([\s\S]*?)mb/i.exec(opt)){
				getParam(matches[1], result, 'traffic', null, replaceTagsAndSpaces, parseBalance);
			}else if(matches = /Осталось([^<]+)минут[^<]+Действует до([^>]*)/i.exec(opt)){
				sumParam(matches[1], result, 'minutes2', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);  
				sumParam(matches[2], result, 'minutes2_till', null, replaceTagsAndSpaces, parseDate, aggregate_min);  
			}else if(matches = /Осталось([^<]+)минут[^<]+UMS/i.exec(opt)){
				sumParam(matches[1], result, 'minutes_net', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);  
			}else if(matches = /Осталось([^<]+)минут[^<]/i.exec(opt)){
				sumParam(matches[1], result, 'minutes', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);  
			}else if(matches = /Осталось([^<]+)(?:смс|sms)/i.exec(opt)){
				sumParam(matches[1], result, 'sms', /Осталось([^<]+)(?:смс|sms)/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);  
			}else{
				AnyBalance.trace('Не удалось разобрать эту опцию :(');
			}
		}
	}
	
	AnyBalance.setResult(result);
}