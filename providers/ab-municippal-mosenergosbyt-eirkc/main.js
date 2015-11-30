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

	if(prefs.site == 'smor'){
		mainSmorodina();
	}else{
		mainLKMO();
	}
}

function mainLKMO() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.lkmo.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите лицевой счет!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'ls') 
			return prefs.login;
		else if (name == 'ps')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl, params, addHeaders({Referer: baseurl}));
	
	if (!/exit\.png/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'fio', /'ttlfio'(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /((?:переплата|Задолженность)(?:[^>]*>){2}[^<]+)/i, [replaceTagsAndSpaces, /Задолженность(.+)/i, '-$1'], parseBalance);
	
	AnyBalance.setResult(result);
}

function mainSmorodina() {
	var prefs = AnyBalance.getPreferences();
	//https://мо.смородина.онлайн/
	var baseurl = 'https://xn--l1ae.xn--80ahmohdapg.xn--80asehdb/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите е-mail!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'pages/abonent/login.jsf', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');

	var form = getElement(html, /<form[^>]+f_login_abon[^>]*>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	}

	var params = createFormParams(form, function(params, str, name, value) {
		if (/:eLogin$/i.test(name)) 
			return prefs.login;
		else if (/:ePwd$/i.test(name)) 
			return prefs.password;

		return value;
	});

	var bid = getParam(form, null, null, /<button[^>]+name="([^"]*)[^>]*submit/i, null, html_entity_decode);
	params['javax.faces.partial.ajax'] = 'true';
	params['javax.faces.source'] = bid;
	params['javax.faces.partial.execute'] = 'f_login_abon:pLogin';
	params['javax.faces.partial.render'] = 'f_login_abon';
	params[bid] = bid;
	
	html = AnyBalance.requestPost(baseurl + 'pages/abonent/login.jsf', params, addHeaders({
		Referer: baseurl + 'pages/abonent/login.jsf', 
		'X-Requested-With':'XMLHttpRequest',
		'Accept': 'application/xml, text/xml, */*; q=0.01',
		'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
	}));

	var urlresult = getParam(html, null, null, /<redirect[^>]+url="([^"]*)/i, null, html_entity_decode);
	
	if (!urlresult) {
		var error = getParam(html, null, null, /<div[^>]+ui-messages-error[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /несуществующий e-mail|Вы не зарегистрированы|неверная комбинация/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var html = AnyBalance.requestGet(baseurl + 'pages/abonent/accounts/accountInfo.jsf?faces-redirect=true', g_headers);
	if(!/Выход/i.test(html)){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось перейти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};
	
	getParam(html, result, 'fio', /Владелец счета:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'licschet', /Номер лицевого счета:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Итого к оплате:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}