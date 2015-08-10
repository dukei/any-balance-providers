/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
	var error = 'Провайдер больше не работает. Используйте провайдер Ростелеком-Регионы. Перед использованием нового личного кабинета, возможно, нужно будет пройти регистрацию. Приносим свои извинения за предоставленные неудобства.'
	throw new AnyBalance.Error(error, null, true);
	
    var prefs = AnyBalance.getPreferences();
    
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var baseurl = "https://issa.akos.ru/cgi-bin/cgi.exe?";
	
	try {
		AnyBalance.trace("Trying to enter issa at address: " + baseurl + "function=is_login");
		var html = AnyBalance.requestPost(baseurl + "function=is_login", {
			mobnum: prefs.login,
			Password: prefs.password
		});
		
		var error = getParam(html, null, null, /<td[^>]+class=['"]?error[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
		if(error){
			throw new AnyBalance.Error(error);
		}

		var result = {success: true};
		
		html = AnyBalance.requestGet(baseurl + "function=is_account");
		
		if(/<TITLE>ICS - [?]{5,}/i.test(html)) {
			throw new AnyBalance.Error('На сайте возникла ошибка в кодировке, обойти эту ошибку невозможно, т.к. она возникает на сайте Акос.');
		}
		if(!/\?function=is_exit/i.test(html)){
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
		
		result.balance = null;
		
		getParam(html, result, 'balance', /Актуальный баланс:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'average_speed', /Средняя скорость расходования средств по лицевому счету в день:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		
		var tableCounters = getParam(html, null, null, /Общая продолжительность разговоров[\s\S]*?<table[^>]*?>([\s\S]*?)<\/table>/i);
		if(tableCounters){
			sumParam(tableCounters, result, 'min', /<td[^>]*?>([^<]*\(мин[^<]*)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
			sumParam(tableCounters, result, 'traffic', /<td[^>]*?>([^<]*\((?:байт|мб|кб|гб)[^<]*)<\/td>/i, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
		}
		getParam(html, result, '__tariff', /issa\/tariff\.gif[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
		
		getParam(html, result, 'sms_used', /<td align=center>(?:&nbsp;|\s*)?SMS[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'min_used', />(?:&nbsp;|\s*)?(?:\d*)?\s*Минут[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseMinutes);
		getParam(html, result, 'traffic_used', /<td align=center>(?:&nbsp;|\s*)?(?:GPRS|3g)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTraffic);
		
		AnyBalance.setResult(result);
	} catch(e) {
		throw e;
	} finally {
		AnyBalance.trace("Trying to exit issa at address: " + baseurl + "function=is_exit");
		html = AnyBalance.requestGet(baseurl + 'function=is_exit');
	}
}
