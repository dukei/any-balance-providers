/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
	throw new AnyBalance.Error('Личный кабинет переехал на login.rt.ru, воспользуйтесь провайдером Ростелеком-Регионы');

	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestPost('https://issa.etk.ru/cgi-bin/cgi.exe?function=is_login', {
		Lang:2,
		mobnum:prefs.login,
		Password:prefs.password,
		x:35,
		y:6
	});
	
	if (!/Осуществляется вход в систему/i.test(html)) {
		var error = getParam(html, null, null, /class=error([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /неверный пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}	
	
	html = AnyBalance.requestGet('https://issa.etk.ru/cgi-bin/cgi.exe?function=is_account');	
	
	var result = {success: true};
	
	getParam(html, result, 'ActualBalance', /Актуальный баланс:([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'DayRashod', /Средняя скорость расходования средств по лицевому счету в день:([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /"Пользователь"([^>]*>){5}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'phone', /"Номер телефона"([^>]*>){5}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'licschet', /"Лицевой счет"([^>]*>){5}/i, replaceTagsAndSpaces, html_entity_decode);
	
	if(isAvailable('trafic')) {
		var traf = getParam(html, null, null, /объем переданных данных типа GPRS составляет([^<]+)/i, replaceTagsAndSpaces);
		if(traf) {
			sumParam(traf, result, 'trafic', /\d+\s\D{1,2}/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
		}
	}
	
	AnyBalance.setResult(result);
}