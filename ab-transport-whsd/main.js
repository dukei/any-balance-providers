/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'	Mozilla/5.0 (Windows NT 6.1; WOW64; rv:23.0) Gecko/20100101 Firefox/23.0'
};

function main(){
    var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var baseurl = 'http://cabinet.nch-spb.com/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'login.aspx', g_headers);

	var __EVENTVALIDATION = getParam(html, null, null, /__EVENTVALIDATION" value="([\s\S]*?)"/i, null, null);
	var __VIEWSTATE = getParam(html, null, null, /__VIEWSTATE" value="([\s\S]*?)"/i, null, null);
	
	html = AnyBalance.requestPost(baseurl + 'login.aspx', {
		'__EVENTARGUMENT':'',
		'__EVENTTARGET':'',
		'__EVENTVALIDATION':__EVENTVALIDATION,
		'__VIEWSTATE':__VIEWSTATE,
		'btnLogin.x':57,
		'btnLogin.y':68,
		'hideLoginError':'',
		'txtPassword':prefs.password,
		'txtUsername':prefs.login,
	}, addHeaders({Referer: baseurl + 'login.aspx'})); 

	if (!/Добро пожаловать в Ваш личный кабинет/i.test(html)) {
		var error = getParam(html, null, null, /"lblErrorLogin"(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error && /введены некорректно/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'acc', /Договор №[\s\S]*?left">([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', /Статус[\s\S]*?left">([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'bsk', /Количество БСК[\s\S]*?left">([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance', /Баланс Вашего лицевого счета[\s\S]*?left">([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'thismonthtravel', /За текущий месяц совершено поездок[\s\S]*?left">([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'thismonthtravelpay', /Общая стоимость поездок, совершенных в[\s\S]*?left">([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'lasttraveldate', /Последняя совершенная поездка[\s\S]*?left">([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
	
    AnyBalance.setResult(result);
}