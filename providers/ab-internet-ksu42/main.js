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
	var baseurl = 'https://stats.ksu42.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'bgbilling/webexecuter', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'bgbilling/webexecuter', {
		user: prefs.login,
		pswd: prefs.password,
		'midAuth': '0'
	}, addHeaders({Referer: baseurl + 'bgbilling/webexecuter'}));
	
	if (!/action=Exit/i.test(html)) {
		var error = getParam(html, null, null, /<h2>ОШИБКА([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /не найден в базе данных|неправильный пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	var accounts = sumParam(html, null, null, /<a href="webexecuter\?action=Super&mid=contract&id=-?\d+(?:[^>]*>){2}/ig);
	checkEmpty(accounts && accounts.length>0, 'Не удалось найти ни одного счета в лично кабинете, сайт изменен?', true);
	AnyBalance.trace('Найдено счетов: ' + accounts.length);
	
	// Если указан номер счета в настройках, надо переключится на него..
	if(prefs.accnum) {
		var found = false;
		for(var i = 0; i < accounts.length; i++) {
			var name = getParam(accounts[i], null, null, /([^>]*>){2}/i, replaceTagsAndSpaces);
			if(endsWith(name, prefs.accnum)) {
				AnyBalance.trace('Счет ' + name + ' похож на нужный нам с последними цифрмаи ' + prefs.accnum);
				found = true;
				break;
			} else {
				AnyBalance.trace('Счет ' + name + ' не подходит, пропускаем');
			}
		}
		checkEmpty(found, 'Не удалось найти счет с последними цифрами ' + prefs.accnum, true);
		var href = getParam(accounts[i], null, null, /href="([^"]+)/i);
		html = AnyBalance.requestGet(baseurl + 'bgbilling/' + href, addHeaders({Referer: baseurl + 'bgbilling/webexecuter'}));
	}
	
	html = AnyBalance.requestGet(baseurl + 'bgbilling/webexecuter?action=ShowBalance&mid=contract', g_headers);
	
	getParam(html, result, 'out_balance', /Исходящий остаток([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'credit', /Обещанный платеж([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /Лицевой счет №([\s\d]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}