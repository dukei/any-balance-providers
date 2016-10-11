/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var baseurl = 'https://cabinet.nch-spb.com/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'onyma/', g_headers);

	html = AnyBalance.requestPost(baseurl + 'onyma/', {
		'login':prefs.login,
		'password':prefs.password,
		'submit': 'Вход'
	}, addHeaders({Referer: baseurl + 'onyma/'})); 
	
	if (!/\/exit\//i.test(html)) {
		var error = getElement(html, /<ul[^>]+errorlist/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}	
	
	var result = {success: true};
	
	getParam(html, result, 'acc', /<td[^>]*>\s*Договор[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'status', /<td[^>]*>\s*Статус[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'balance', /<td[^>]*>\s*Баланс[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
/*
	if(AnyBalance.isAvailable('bsk', 
	var html = AnyBalance.requestGet(baseurl + 'onyma/lk/account/', g_headers);

	getParam(html, result, 'bsk', /Количество (?:Транспондеров\/ )?БСК(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'thismonthtravel', /За текущий месяц совершено поездок(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'thismonthtravelpay', /Общая стоимость поездок, совершенных в(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'lasttraveldate', /Последняя совершенная поездка(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
*/	
    AnyBalance.setResult(result);
}