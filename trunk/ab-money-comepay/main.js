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
	var baseurl = 'https://money.comepay.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	prefs.login = getParam(prefs.login, null, null, /^\+7\d{10}$/i, [/\+7(\d{3})(\d{3})(\d{2})(\d{2})/, '+7($1) $2-$3-$4']);
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'ctl00$ctl00$ctl00$cphMainContent$ucAccount$AccountTextBox') 
			return prefs.login;
		else if (name == 'ctl00$ctl00$ctl00$cphMainContent$ucAccount$PasswordTextBox')
			return prefs.password;

		return value;
	});

	html = AnyBalance.requestPost(baseurl, {
		'ctl00$ctl00$MainScriptManager':'ctl00$ctl00$updMain|ctl00$ctl00$cphMainContent$ucAccount$LoginImage',
		'__EVENTTARGET':'ctl00$ctl00$cphMainContent$ucAccount$LoginImage',
		'__EVENTARGUMENT':'',
		'__VIEWSTATE':params['__VIEWSTATE'],
		'__EVENTVALIDATION':params['__EVENTVALIDATION'],
		'ctl00$ctl00$ucLocation$tbCitySearch':'',
		'ctl00$ctl00$ucTopMenu$hdnBillsCountForTopMenu':'0',
		'ctl00$ctl00$ucHelpPopup$hdnTheme':'',
		'ctl00$ctl00$ucHelpPopup$helpPopupMess':'',
		'ctl00$ctl00$ucHelpPopup$helpPopupName':'',
		'ctl00$ctl00$ucHelpPopup$helpPopupEmail':'',
		'ctl00$ctl00$cphMainContent$ucAccount$AccountTextBox':prefs.login,
		'ctl00$ctl00$cphMainContent$ucAccount$PasswordTextBox':prefs.password,
		'ctl00$ctl00$cphMainContent$ucAccount$ImAccountTextBox':'',
		'ctl00$ctl00$cphMainContent$ucAccount$ImPasswordTextBox':'',
		'ctl00$ctl00$cphMainContent$ucAccount$hfReloadHtml':'',
		'ctl00$ctl00$cphMainContent$ucSearch$SearchTextBox':'',
		'ctl00$ctl00$cphMainContent$ucSearch$ProviderID':'',
		'ctl00$ctl00$cphMainContent$CentralContent$ucPayList$ucSearch$SearchTextBox':'',
		'ctl00$ctl00$cphMainContent$CentralContent$ucPayList$ucSearch$ProviderID':'',
		'__ASYNCPOST':'true',
		'':''
	}, addHeaders({Referer: baseurl}));
	
	if (!/pageRedirect/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var redirect = getParam(html, null, null, /pageRedirect\|[^\|]*\|?([^\|]+)/i, replaceTagsAndSpaces, decodeURIComponent);
	html = AnyBalance.requestGet(redirect, g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /"balance">\s*Баланс:(?:[^>]*>){9}([.,\-\s\d]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /"purse">\s*Кошелек(?:[^>]*>){2}([\s\d]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'wallet', /"purse">\s*Кошелек(?:[^>]*>){2}([\s\d]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}