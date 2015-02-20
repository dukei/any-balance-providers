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
	var authurl = 'https://auth.robokassa.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.id, 'Введите идентификатор клиента!');
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(authurl + 'partner/Login.aspx?ReturnURL=https%3a%2f%2fpartner.robokassa.ru%2f%3fculture%3dru', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var params = createFormParams(html, function(params, str, name, value) {
		return value;
	});

	html = AnyBalance.requestPost(authurl + 'partner/Login.aspx?ReturnURL=https%3a%2f%2fpartner.robokassa.ru%2f%3fculture%3dru', {
		__EVENTTARGET: 'ctl00$PhBody$BSubmit',
		__EVENTARGUMENT: params.__EVENTARGUMENT,
		__VIEWSTATE: params.__VIEWSTATE,
		__VIEWSTATEGENERATOR: params.__VIEWSTATEGENERATOR,
		__EVENTVALIDATION: params.__EVENTVALIDATION,
		'ctl00$PhBody$TPartnerIdentifier': prefs.id,
		'ctl00$PhBody$TUserName': prefs.login,
		'ctl00$PhBody$TPassword': prefs.password,
		TPasswordT: ''
	}, addHeaders({Referer: authurl + 'partner/Login.aspx?ReturnURL=https%3a%2f%2fpartner.robokassa.ru%2f%3fculture%3dru'}));
	
	if (!/logOff/i.test(html)) {
		var error = getParam(html, null, null, /<span[^>]+class="error_login"[^>]*>[\s\S]*?<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /не найден или указан неправильный пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	sumParam(html, result, 'shops', /shopRow[\s\S]+?shop-upper[^>]+>((?:[\s\S](?!<div class="shop-lower))+[\s\S](?:[\s\S](?!<\/div))+[\s\S])/ig, null, null, aggregateShops);
	getParam(html, result, 'name', /page-title[\s\S]+?(<h1>[\w\s]+<\/h1>)/i, replaceTagsAndSpaces, html_entity_decode);

	AnyBalance.setResult(result);
}

function aggregateShops(shops){
	if(!shops || shops.length === 0)
		throw new AnyBalance.Error('Не найдено ни одного магазина');

	var res = [], name, status, balance;
	for(var i = 0, toi = shops.length; i < toi; i++){
		name = getParam(shops[i], null, null, /class="name[^>]>\s*[^>]+>([^<]+)/i, replaceTagsAndSpaces);
		status = getParam(shops[i], null, null, /shop-lower(?:[\s\S](?!<b>))+[\s\S](<[^<]+<\/b>)/i, replaceTagsAndSpaces);
		balance = getParam(shops[i], null, null, /<a class="balance[^>]+>(?:[\s\S](?!<\/div>))+[\s\S]/i, replaceTagsAndSpaces);
		res.push(
			(name || 'Имя магазина не найдено') + 
			' (' + (status || 'Статус не найден') + ') ' + 
			(balance ? '<b>' + parseBalance(balance) + ' ' + parseCurrency(balance) + '</b>' : '')
		);
	}
	return res.join('<br />');
}