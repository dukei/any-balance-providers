/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://discounttelecom.ru/";
    AnyBalance.setDefaultCharset('utf-8'); 
	// запрашиваем форму входа, чтобы получить параметры авторизации
	var html = AnyBalance.requestGet(baseurl + 'register/login/?return=/cabinet/', g_headers);
	
	var __VIEWSTATE = getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
	var __EVENTVALIDATION = getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/);

    html = AnyBalance.requestPost(baseurl + 'register/login/default.aspx?return=/cabinet/', {
		'__CURRENTREFRESHTICKET':'0',
		'__EVENTARGUMENT':'',
		'__EVENTTARGET':'',
		'__EVENTVALIDATION':__EVENTVALIDATION,
		'__VIEWSTATE':__VIEWSTATE,
		'ctl00$ctl00$MainContentHolder$MainContentHolder$SmallLogin$btnLogin':'',
		'ctl00$ctl00$MainContentHolder$MainContentHolder$SmallLogin$tbLogin':prefs.login,
		'ctl00$ctl00$MainContentHolder$MainContentHolder$SmallLogin$tbPwd':prefs.password,
	}, addHeaders({Referer: baseurl +'register/login/default.aspx?return=/cabinet/'})); 

    if(!/act=logout/i.test(html)){
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Проверьте Ваш логин и пароль');
    }
	
	html = AnyBalance.requestGet(baseurl + 'cabinet/account/', g_headers);

    var result = {success: true};
	getParam(html, result, 'account', /Договор:[\s\S]{1,100}">([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Состояние лицевого счета[\s\S]*?([\s\S]*?)р./i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonus', /Из них [\s\S]*?([\s\S]*?)р./i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
