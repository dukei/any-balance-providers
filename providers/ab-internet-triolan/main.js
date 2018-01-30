/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru,en-US;q=0.8,en;q=0.6',
	'Connection': 'keep-alive',
	'Accept-Encoding': 'gzip, deflate, br',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36',
};

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function getEventValidation(html){
    return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/);
}


function main() {
	AnyBalance.setOptions({
		SSL_ENABLED_PROTOCOLS: ['TLSv1'] //У этих странных людей даже SSL2 и 3 включены
	});

	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://triolan.name/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'LP.aspx', g_headers);

	var formRedirect = getElements(html, [/<form/ig, /btn_toLK/i])[0];
	if(formRedirect){
		AnyBalance.trace('Промежуточная переадресация..');
		html = AnyBalance.requestPost(baseurl, createFormParams(formRedirect), addHeaders({
			Referer: baseurl, 
			Origin: baseurl.replace(/\/+$/, '')
		}));
	}

	html = AnyBalance.requestPost(baseurl + 'LP.aspx', {
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
	
	if (!/(&#39;|>)Выход(<|&#39;)/i.test(html)) {
		var error = getParam(html, null, null, /lbError"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
    getParam(html, result, 'license', /№ лицевого счета:[\s\S]*?<li[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Баланс:[\s\S]*?<li[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'till', /Оплачено до:[\s\S]*?<li[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseDate);

    getParam(html, result, '__tariff', /Тариф:[\s\S]*?<li[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /<select name="ctl00\$cph_main\$ddl_activations"[\s\S]*?value=[\s\S]*?>"?([^<"]*)"?</i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}