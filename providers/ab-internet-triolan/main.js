/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru,en-US;q=0.8,en;q=0.6',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36',
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

//	AnyBalance.setCookie(baseurl.replace(/\w+:\/\/([^\/]+)/, '$1'), 'triolan_name_user_login', prefs.login);
//	AnyBalance.sleep(8000);
	
	try {
		html = AnyBalance.requestPost(baseurl, {
			'__EVENTTARGET':'',
			'__EVENTARGUMENT':'',
			'__VIEWSTATE':getViewState(html),
			'__VIEWSTATEENCRYPTED':'',
			'__EVENTVALIDATION':getEventValidation(html),
			'login2$tbAgreement':prefs.login,
			'login2$tbPassword':prefs.password,
			'login2$btnLoginByAgr':'Войти',
			'login2$tbPhone':'',
			'login2$tbEmail':'',
			'login2$hfType':'1',
		}, addHeaders({
			Referer: baseurl, 
			Origin: baseurl.replace(/\/+$/, '')
		}));
	} catch(e) {}
	
	if (!/>Выход</i.test(html)) {
		var error = getParam(html, null, null, /lbError"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'RegRovno.aspx', g_headers);
	

	
	var result = {success: true};
	
    getParam(html, result, 'license', /id="l_stat"[\s\S]*?Л\/с[\s\S]*?>([^<]*)</i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /<select name="ctl00\$cph_main\$ddl_activations"[\s\S]*?value=[\s\S]*?>"?([^<"]*)"?</i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /id="l_stat"[\s\S]*?Баланс:[\s\S]*?>"?([^<]*)"?</i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'till', /id="l_stat"[\s\S]*?оплачено по:[\s\S]*?>([^<]*)</i, replaceTagsAndSpaces, parseDateISO);
	
	AnyBalance.setResult(result);
}