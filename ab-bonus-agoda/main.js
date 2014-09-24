/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': '*/*',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.57 Safari/537.36',
	'Origin':'https://www.agoda.com'
};

function getViewState(html) {
	return getParam(html, null, null, /"__VIEWSTATE"[^>]*value="([^"]+)/i);
}

function getEventValidation(html) {
	return getParam(html, null, null, /"__EVENTVALIDATION"[^>]*value="([^"]+)/i);
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.agoda.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Enter login!');
	checkEmpty(prefs.password, 'Enter password!');

	var html = AnyBalance.requestGet(baseurl + 'rewards/login.html', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'rewards/login.html', {
		'ctl00$ctl00$scriptmanager1':'ctl00$ctl00$MainContent$ContentMain$udpMain|ctl00$ctl00$MainContent$ContentMain$RewardLogin1$btnSignIn',
		'ctl00_ctl00_scriptmanager1_HiddenField':'',
		'__EVENTTARGET':'',
		'__EVENTARGUMENT':'',
		'__VIEWSTATE':getViewState(html),
		'__EVENTVALIDATION':getEventValidation(html),
		'ctl00$ctl00$ddlCurrency$hidCurrencyChange':'USD',
		'ctl00$ctl00$ddlCurrency$hidCurrencySelected':'',
		'ctl00$ctl00$MainContent$ContentMain$RewardLogin1$txtEmail':prefs.login,
		'ctl00$ctl00$MainContent$ContentMain$RewardLogin1$txtPassword':prefs.password,
		'__ASYNCPOST':'true',
		'ctl00$ctl00$MainContent$ContentMain$RewardLogin1$btnSignIn':'Sign In',
	}, addHeaders({
		Referer: baseurl + 'rewards/login.html',
		'X-MicrosoftAjax':'Delta=true',
		'X-Requested-With':'XMLHttpRequest'
	}));
	
	if (!/pageRedirect\|\|%2frewards%2fmanagebooking\.html/i.test(html)) {
		var error = getParam(html, null, null, /class="notification_error"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Email or Password is incorrect/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestPost(baseurl + 'rewards/managebooking.html', {
		'ctl00$ctl00$scriptmanager1':'ctl00$ctl00$MainContent$leftMenu1$udpMenu|ctl00$ctl00$MainContent$leftMenu1$lbtMyReward',
		'ctl00_ctl00_scriptmanager1_HiddenField':'',
		'__EVENTTARGET':'ctl00$ctl00$MainContent$leftMenu1$lbtMyReward',
		'__EVENTARGUMENT':'',
		'__VIEWSTATE':getViewState(html),
		'__EVENTVALIDATION':getEventValidation(html),
		'ctl00$ctl00$Googlesearch$txtSearch':'',
		'__ASYNCPOST':'true',
		'':''
	}, addHeaders({
		Referer: baseurl + 'rewards/managebooking.html',
		'X-MicrosoftAjax':'Delta=true',
		'X-Requested-With':'XMLHttpRequest'
	}));

	html = AnyBalance.requestGet(baseurl + 'rewards/transactions.html', g_headers);

	var result = {success: true};
	
	getParam(html, result, 'balance', />Available Points(?:[\s\S]*?<td[^>]*>){3}([^<]*)/i, [replaceTagsAndSpaces, /\D/, ''], parseBalance);

	AnyBalance.setResult(result);
}