/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.86 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://my.3mob.ua';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите номер телефона!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestPost(baseurl + '/ua/login', {
		phone: prefs.login,
		password: prefs.password
	}, addHeaders({Referer: baseurl + '/ua/', 'X-Requested-With': 'XMLHttpRequest'}));

	if (/error/i.test(html)) {
		var error = getJson(html);  
	        throw new AnyBalance.Error(error.data, null, /Невірно введено пароль/i.test('' + error.data));
        
                AnyBalance.trace(html);
                throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
        }

	var result = {success: true};

	html = AnyBalance.requestGet(baseurl + '/ua/profile', g_headers);

	getParam(html, result, '__tariff', /Назва<[^>]*><[^>]*>([^<]*)</i, replaceTagsAndSpaces);
	getParam(html, result, 'deadline', /Дата деактивації:?<[^>]*><[^>]*><[^>]*>([^<]+)</i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'balance', /Основний баланс<[^>]*><[^>]*>([^>]*) грн</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance_bonus', /Бонусний баланс<[^>]*><[^>]*>([^>]*) грн</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'mobphone', />\s*Номер телефону<[^>]*><[^>]*><[^>]*>([^<]*)</i, replaceTagsAndSpaces);

	html = AnyBalance.requestGet(baseurl + '/ua/finance/balance', g_headers);

	getParam(html, result, 'minutes_local', /<tr ><td>Голосовий баланс в мережі Тримоб \(сек\)<[^>]*><[^>]*>([^>]*)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'minutes_roam', /<tr ><td>Голосовий баланс в межах України \(сек\)<[^>]*><[^>]*>([^>]*)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'internet_local', /<tr ><td>Інтернет в мережі Тримоб \(КБайт\)<[^>]*><[^>]*>([^>]*)</i, [replaceTagsAndSpaces, /(.*)/i, '$1 kb'], parseTraffic);
	getParam(html, result, 'internet_roam', /<tr ><td>Інтернет в мережі Тримоб та нац.роумінгу \(КБайт\)<[^>]*><[^>]*>([^>]*)</i, [replaceTagsAndSpaces, /(.*)/i, '$1 kb'], parseTraffic);
	getParam(html, result, 'internet_roaming', /<tr ><td>Інтернет в  нац.роумінгу \(КБайт\)<[^>]*><[^>]*>([^>]*)</i, [replaceTagsAndSpaces, /(.*)/i, '$1 kb'], parseTraffic);
	getParam(html, result, 'internet_bezlim', /<tr ><td>Безлім на день\/ Нічний Безлім \(КБайт\)<[^>]*><[^>]*>([^>]*)</i, [replaceTagsAndSpaces, /(.*)/i, '$1 kb'], parseTraffic);
	getParam(html, result, 'internet_action', /<tr ><td>Акційний баланс \(КБайт\)<[^>]*><[^>]*>([^>]*)</i, [replaceTagsAndSpaces, /(.*)/i, '$1 kb'], parseTraffic);
	getParam(html, result, 'balance_sms', /<tr ><td>SMS в межах України \(штук\)<[^>]*><[^>]*>([^>]*)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'money_transfer', /<tr ><td>Грошовий переказ Utransfer \(грн\)<[^>]*><[^>]*>([^>]*)</i, replaceTagsAndSpaces, parseBalance);

	getParam(html, result, 'balance_termin', /<tr ><td>Основний баланс \(грн\)<[^>]*><[^>]*>[^>]*<[^>]*><[^>]*>([^<]+)</i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'balance_bonus_termin', /<tr ><td>Бонусний грошовий баланс \(грн\)<[^>]*><[^>]*>[^>]*<[^>]*><[^>]*>([^<]+)</i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'minutes_local_termin', /<tr ><td>Голосовий баланс в мережі Тримоб \(сек\)<[^>]*><[^>]*>[^>]*<[^>]*><[^>]*>([^<]+)</i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'minutes_roam_termin', /<tr ><td>Голосовий баланс в мережі Тримоб та нац.роумінгу \(сек\)<[^>]*><[^>]*>[^>]*<[^>]*><[^>]*>([^<]+)</i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'internet_local_termin', /<tr ><td>Інтернет в мережі Тримоб \(КБайт\)<[^>]*><[^>]*>[^>]*<[^>]*><[^>]*>([^<]+)</i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'internet_roam_termin', /<tr ><td>Інтернет в мережі Тримоб та нац.роумінгу \(КБайт\)<[^>]*><[^>]*>[^>]*<[^>]*><[^>]*>([^<]+)</i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'internet_roaming_termin', /<tr ><td>Інтернет в  нац.роумінгу \(КБайт\)<[^>]*><[^>]*>[^>]*<[^>]*><[^>]*>([^<]+)</i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'internet_bezlim_termin', /<tr ><td>Безлім на день\/ Нічний Безлім \(КБайт\)<[^>]*><[^>]*>[^>]*<[^>]*><[^>]*>([^<]+)</i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'internet_action_termin', /<tr ><td>Акційний баланс \(КБайт\)<[^>]*><[^>]*>[^>]*<[^>]*><[^>]*>([^<]+)</i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'balance_sms_termin', /<tr ><td>SMS в межах України \(штук\)<[^>]*><[^>]*>[^>]*<[^>]*><[^>]*>([^<]+)</i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'money_transfer_termin', /<tr ><td>Грошовий переказ Utransfer \(грн\)<[^>]*><[^>]*>[^>]*<[^>]*><[^>]*>([^<]+)</i, replaceTagsAndSpaces, parseDate);

	html = AnyBalance.requestGet(baseurl + '/logout', g_headers);

	AnyBalance.setResult(result);
}
