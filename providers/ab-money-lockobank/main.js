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

function getParamByName(html, name) {
	return getParam(html, null, null, new RegExp('name="' + name + '"[^>]*value="([^"]*)"'));
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://i.lockobank.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'Account/Login?ReturnUrl=%2f', g_headers);
	
	if(AnyBalance.getLastStatusCode() > 400) {
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	}
	
	var form = AB.getElement(html, /<form[^>]+signin-online-bank/);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа! Сайт изменен?');
	}

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'Login') {
			return prefs.login;
		} else if (name == 'Password') {
			return prefs.password;
		}

		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'Account/Login', params, addHeaders({Referer: baseurl + 'Account/Login?ReturnUrl=%2f', 'Origin':'https://i.lockobank.ru'}));
	
	if (!/SignOut/i.test(html)) {
		var error = getElement(html, /<[^>]+error-message/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	if (prefs.type == 'card')
		fetchCard(baseurl, html, result);
	else if (prefs.type == 'dep') 
		fetchDeposit(baseurl, html, result);
	//else if (prefs.type == 'cred') 
		//fetchCredit(baseurl, html, result);
	else
		fetchAccount(baseurl, html, result);
	
	AnyBalance.setResult(result);
}

function fetchDeposit(baseurl, html, result){
    var prefs = AnyBalance.getPreferences();
	
    /*if(prefs.num && !/^\d{4}$/.test(prefs.num))
        throw new AnyBalance.Error('Введите последние 4 цифры интересующего вас депозита или не вводите ничего, чтобы получить информацию по первому счету!');
	*/
	var href = getParam(getElement(html, /<div[^>]+item-Deposits/i), null, null, /<a[^>]+href="([^"]+)/i, replaceHtmlEntities);
	if(!href) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти ссылку на информацию по депозитам, сайт изменен?');
	}
	
	html = AnyBalance.requestGet(joinUrl(baseurl, href), g_headers);
	
    var table = getParam(html, null, null, /class="cH">Депозиты<([\s\S]*?)<\/table>/);
    if(!table)
        throw new AnyBalance.Error('Не найдено ни одного депозита!');
	
	getParam(table, result, 'type', />Валюта(?:[\s\S]*?<td[^>]*>){7}([^<]+)/i, replaceTagsAndSpaces);
	getParam(table, result, 'balance', />Валюта(?:[\s\S]*?<td[^>]*>){8}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, ['currency', '__tariff'], />Валюта(?:[\s\S]*?<td[^>]*>){6}([^<]+)/i, replaceTagsAndSpaces);
}

function fetchAccount(baseurl, html, result){
    var prefs = AnyBalance.getPreferences();
	
    if(prefs.num && !/^\d{4}$/.test(prefs.num))
        throw new AnyBalance.Error('Введите последние 4 цифры интересующего вас счета или не вводите ничего, чтобы получить информацию по первому счету!');
	
	var href = getParam(getElement(html, /<div[^>]+item-Accounts/i), null, null, /<a[^>]+href="([^"]+)/i, replaceHtmlEntities);
	if(!href) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти ссылку на информацию по счетам, сайт изменен?');
	}
	
	html = AnyBalance.requestGet(joinUrl(baseurl, href), g_headers);
	// <tr>\s*(?:[^>]*>){5}\d{16}2000(?:[^>]*>){5,7}\s*</tr>
	var re = new RegExp('<tr>\\s*(?:[^>]*>){5}\\d{16}' + (prefs.num || '\\d{4}') + '(?:[^>]*>){5,7}\\s*</tr>', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error(prefs.num ? 'Не удалось найти счет с последними цифрами ' + prefs.num : 'Не найдено ни одного счета!');
	
	getParam(tr, result, 'type', /(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(tr, result, 'accnum', /(?:[^>]*>){5}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(tr, result, 'balance', /(?:[^>]*>){11}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(tr, result, ['currency', '__tariff'], /(?:[^>]*>){9}([\s\S]*?)<\//i, replaceTagsAndSpaces);
}

function fetchCard(baseurl, html, result){
    var prefs = AnyBalance.getPreferences();

    if(prefs.num && !/^\d{4}$/.test(prefs.num))
        throw new AnyBalance.Error('Введите последние 4 цифры интересующей вас карты или не вводите ничего, чтобы получить информацию по первой карте!');
	
	var href = getParam(getElement(html, /<div[^>]+item-Cards/i), null, null, /<a[^>]+href="([^"]+)/i, replaceHtmlEntities);
	if(!href) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти ссылку на информацию по картам, сайт изменен?');
	}
	
	html = AnyBalance.requestGet(joinUrl(baseurl, href), g_headers);

	var tbl = getParam(html, null, null, /<td[^>]+class="cH"[^>]*>\s*Банковские карты[\s\S]*?(<table[\s\S]*?<\/table>)/i);
	if(!tbl){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти таблицу карт');
	}

	var trs = getElements(tbl, /<tr/ig);
	AnyBalance.trace('Найдено ' + (trs.length -1) + ' карт');

	for(var i=0; i<trs.length; ++i){
		var tr = trs[i];
		if(/<td[^>]+hdr/i.test(tr)) //Заголовок
			continue;
		var num = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		AnyBalance.trace('Найдена карта ' + num);

		if(!prefs.num || endsWith(num, prefs.num)){
			AnyBalance.trace('Карта ' + num + ' подходит');

			getParam(tr, result, 'type', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
			getParam(tr, result, 'cardnum', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
			getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
			getParam(tr, result, 'fio', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
			getParam(tr, result, 'till', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
			getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, /В процессе изготовления|Готова для выдачи/i, '0.00'], parseBalance);
			getParam(tr, result, ['currency', 'balance'], /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
			break;
		}
	}

    if(i>=trs.length)
        throw new AnyBalance.Error(prefs.num ? 'Не удалось найти карту с последними цифрами ' + prefs.num : 'Не найдено ни одной карты!');
}