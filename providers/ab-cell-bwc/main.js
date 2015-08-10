/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main() {
	var error = 'Провайдер больше не работает. Используйте провайдер Ростелеком-Регионы. Перед использованием нового личного кабинета, возможно, нужно будет пройти регистрацию. Приносим свои извинения за предоставленные неудобства.'
	throw new AnyBalance.Error(error, null, true);

	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var baseurl = "https://issa.bwc.ru/cgi-bin/cgi.exe?";
	
	var html = AnyBalance.requestPost(baseurl + "function=is_login", {
		mobnum: prefs.login,
		Password: prefs.password
	});
	
	if (!/Осуществляется вход в систему/i.test(html)) {
		var error = getParam(html, null, null, /<td class=error>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	html = AnyBalance.requestGet(baseurl + 'function=is_account');
	
	getParam(html, result, 'balance', /Актуальный баланс:(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'average_speed', /Средняя\s*скорость\s*расходования\s*средств\s*по\s*лицевому\s*счету\s*в\s*день:(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
	var table = getParam(html, null, null, /Общая продолжительность разговоров[^>]*>\s*(<table[\s\S]*?<\/table>)/i);
	if (table) {
		var options = sumParam(table, null, null, /(<tr\s*valign="top"\s*class=light>[\s\S]*?<\/tr>)/ig, null, html_entity_decode);
		for (i = 0; i < options.length; i++) {
			var option = options[i];
			var name = getParam(option, null, null, /(?:[^>]*>){4}([^<]*)/i);
			AnyBalance.trace('Нашли опцию ' + name);
			// Интернет 
			if (/3G|GPRS|\d+\s+Мб|\d\s*Гб/i.test(name)) {
				sumParam(option, result, ['traffic_used', 'traffic_total'], /(?:[^>]*>){6}([^<]*)/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
				sumParam(option, result, ['traffic_left', 'traffic_total'], /(?:[^>]*>){8}([^<]*)/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
				
				getParam(result.traffic_left + result.traffic_used, result, 'traffic_total');
			} // Пакеты минут
			else if (/\d+\s+мин|Penta.?\s*\d+/i.test(name)) {
				sumParam(option, result, ['min_used', 'min_total'], /(?:[^>]*>){6}([^<]*)/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
				sumParam(option, result, ['min_left', 'min_total'], /(?:[^>]*>){8}([^<]*)/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
				
				getParam(result.min_used + result.min_left, result, 'min_total');
			} else {
				AnyBalance.trace('Неизвестная опция ' + name + ' свяжитесь с разработчиком! ' + option);
			}
		}
	}
	
	AnyBalance.setResult(result);
}