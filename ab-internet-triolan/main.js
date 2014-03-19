/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	// Mobile
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	// Desktop
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function getEventValidation(html){
    return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/);
}


function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://triolan.name/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	try {
		html = AnyBalance.requestPost(baseurl, {
			'__EVENTTARGET':'',
			'__EVENTARGUMENT':'',
			'__VIEWSTATE':getViewState(html),
			'__VIEWSTATEENCRYPTED':'',
			'__EVENTVALIDATION':getEventValidation(html),
			'login1$tbAgreement':prefs.login,
			'login1$tbPassword':prefs.password,
			'login1$btnLoginByAgr':'Войти',
			'login1$tbPhone':'',
			'login1$tbEmail':'',
			'login1$hfType':'1',
		}, addHeaders({Referer: baseurl}));
	} catch(e) {}
	
	html = AnyBalance.requestGet(baseurl + 'RegRovno.aspx', g_headers);
	
	if (!/>Выход</i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
    getParam(html, result, 'license', /id="l_stat"[\s\S]*?Л\/с[\s\S]*?>([^<]*)</i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /<select name="ctl00\$cph_main\$ddl_activations"[\s\S]*?value=[\s\S]*?>"?([^<"]*)"?</i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /id="l_stat"[\s\S]*?Баланс:[\s\S]*?>"?([^<]*)"?</i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'till', /id="l_stat"[\s\S]*?оплачено по:[\s\S]*?>([^<]*)</i, replaceTagsAndSpaces, parseDate);
	
	AnyBalance.setResult(result);
}