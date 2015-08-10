/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'Origin':'https://lk.itpc.ru',	
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.95 Safari/537.36',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://lk.itpc.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'login.aspx', g_headers);

	var __VIEWSTATE = getParam(html, null, null, /__VIEWSTATE[^>]*value="([\s\S]*?)"/i, null, null);
	var __EVENTVALIDATION = getParam(html, null, null, /__EVENTVALIDATION[^>]*value="([\s\S]*?)"/i, null, null);

	html = AnyBalance.requestPost(baseurl + 'login.aspx', {
		'__LASTFOCUS':'',
		'__EVENTTARGET':'',
		'__EVENTARGUMENT':'',
		'__VIEWSTATE':__VIEWSTATE,
		'__EVENTVALIDATION':__EVENTVALIDATION,
		'ctl00$ContentPlaceHolder2$stLoginLK':'',
		'ctl00$ContentPlaceHolder2$stPasswordLK':'',
		'ctl00$ContentPlaceHolder2$Login1$UserName':prefs.login,
		'ctl00$ContentPlaceHolder2$Login1$Password':prefs.password,
		'ctl00$ContentPlaceHolder2$Login1$LoginButton':'Войти',
		'DXScript':'1_42,1_74,2_15',
	}, addHeaders({Referer: baseurl + 'login.aspx'})); 

    if(!/LogoutPanel/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);

        error = getParam(html, null, null, /В доступе отказано. Проверьте правильность логина и пароля./i);
        if(error)
            throw new AnyBalance.Error('В доступе отказано. Проверьте правильность логина и пароля. Возможно нажат CAPS LOCK или выбран не правильный язык ввода.', null, true);

        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
    var result = {success: true};
    getParam(html, result, 'account', /<input[^>]*id="cbLschetList_I"[^>]*value="([^>]*?)"[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'adress', /Адрес(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'beginperiod', /Начало(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	// Получаем таблицу платежей
	__VIEWSTATE = getParam(html, null, null, /__VIEWSTATE[^>]*value="([\s\S]*?)"/i, null, null);
	__EVENTVALIDATION = getParam(html, null, null, /__EVENTVALIDATION[^>]*value="([\s\S]*?)"/i, null, null);
	var callback = getParam(html, null, null, /ASPxGridView1_CallbackState[^>]*value="([^"]*)/i, null, null);
	
	html = AnyBalance.requestPost(baseurl + 'security/MainPage.aspx', {
		'__LASTFOCUS':'',
		'__EVENTTARGET':'ctl00$ContentPlaceHolder2$PanelInfoLS$ASPxMenu1',
		'__EVENTARGUMENT':'CLICK:1',
		'__VIEWSTATE':__VIEWSTATE,
		'__EVENTVALIDATION':__EVENTVALIDATION,
		'ctl00$ContentPlaceHolder2$PanelInfoLS$ASPxGridView1$CallbackState':callback,
		'DXScript':'1_42,1_74,2_15,1_40,1_67,1_64,1_41,1_72,1_58,1_52,1_65,3_8,3_7,2_22,2_29,1_57',
	}, addHeaders({Referer: baseurl + 'security/MainPage.aspx'})); 
	
	getParam(html, result, 'balance', /<tr id="ASPxGridView1_DXDataRow0(?:[^>]*>){15,25}([^<]+)<\/td>\s*<\/tr>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}