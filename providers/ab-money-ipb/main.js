/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'image/webp,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.81 Safari/537.36',
	'Origin': 'https://on-line.ipb.ru'
};

function getParamByName(html, param) {
	return getParam(html, null, null, new RegExp('name="' + param + '"[^>]*value="([^"]*)','i'));
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://on-line.ipb.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'Login/login.aspx', g_headers);

	var params = {
		'__LASTFOCUS': '',
		'_TSM_HiddenField_': getParamByName(html, '_TSM_HiddenField_'),
		'__EVENTTARGET': '',
		'__EVENTARGUMENT': '',
		'__VIEWSTATE': getParamByName(html, '__VIEWSTATE'),
		'__VIEWSTATEGENERATOR':	getParamByName(html, '__VIEWSTATEGENERATOR'),
		'__EVENTVALIDATION': getParamByName(html, '__EVENTVALIDATION'),
		'tbLogin': prefs.login,
		'tbPassword': prefs.password,
		'HiddenField1':'',
		'HiddenField2':'',
		'btnAccept': 'Далее',
		'hfCBW':'',
		'HiddenField_GUID':'',
		'tbxSMSPwd':'',
		'tbxTokenPwd':'',
		'hfewc': 'false',
		'ctl00_HiddenFieldIdAbonent':'',
		'ctl00_HiddenFieldApletVer':'',
		'ctl00_HiddenFieldApletPath':'',
	};
	
	html = AnyBalance.requestPost(baseurl + 'Login/login.aspx', params, addHeaders({Referer: baseurl + 'Login/login.aspx'}));
	
	if (!/Выход/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var account = getParam(html, null, null, new RegExp('<tr[^>]*class="normal"(?:[^>]*>){5}\\d{14,}' + (prefs.digits || '\\d{4}') + '(?:[^>]*>){40,50}\\s*</tr>', 'i'));
	if(!account) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.digits ? 'Счет с последними цифрами ' + prefs.digits : 'ни одного счета!'));
	}
	
	var result = {success: true};
	
	getParam(account, result, 'balance', /(?:[^>]*>){40}([\s\d.,-]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(account, result, ['currency', 'balance'], /(?:[^>]*>){33}([^<]+)/i, replaceTagsAndSpaces);
	getParam(account, result, 'deadline', /(?:[^>]*>){41}([^<]+)/i, replaceTagsAndSpaces, parseDate);
	getParam(account, result, 'accnum', /\d{20}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(account, result, 'cardnum', /\d{4,8}\*{4,6}\d{4}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(account, result, '__tariff', /\d{4,8}\*{4,6}\d{4}/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}