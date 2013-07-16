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
    var baseurl = 'http://control.b-prime.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

	var html = AnyBalance.requestGet(baseurl, g_headers);

	html = AnyBalance.requestPost(baseurl, {
		TBLogin:prefs.login,
        TBPassword:prefs.password,
        BLogin:'Вход',
		'__EVENTVALIDATION':getParam(html, null, null, /__EVENTVALIDATION"\s*value="([\s\S]*?)"/i, null, null),
		'__VIEWSTATE':getParam(html, null, null, /__VIEWSTATE"\s*value="([\s\S]*?)"/i, null, null)
    }, g_headers); 
	
    if(!/lnkLogOff/i.test(html)){
        var error = getParam(html, null, null, /<span id="LError" class="errorLabel">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	// Теперь ищем номер договора, и переходим на страницу с балансами
	var acc = getParam(html, null, null, /Лицевой счёт:\s*(\d+)/i, null, null);
	if(!acc)
		throw new AnyBalance.Error('Не удалось найти номер договора. Сайт изменен?');

	html = AnyBalance.requestPost(baseurl + 'UserProfile.aspx?UserId='+acc, {
		'__EVENTARGUMENT':'',
		'__EVENTTARGET':'ctl01$lnkUserProfile',
		'__PREVIOUSPAGE':getParam(html, null, null, /__PREVIOUSPAGE"\s*value="([\s\S]*?)"/i, null, null),
		'ctl01$txtSearch':'Введите номер SIM',
		'__EVENTVALIDATION':getParam(html, null, null, /__EVENTVALIDATION"\s*value="([\s\S]*?)"/i, null, null),
		'__VIEWSTATE':getParam(html, null, null, /__VIEWSTATE"\s*value="([\s\S]*?)"/i, null, null)
    }, addHeaders({Referer:baseurl + 'UserProfile.aspx?UserId='+acc})); 
	
	
    var result = {success: true};
    getParam(html, result, 'acc', /Номер Л\/с[\s\S]{1,200}">\s*([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Баланс:[\s\S]{1,200}">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /<option selected="selected"[\s\S]*?>([\s\S]*?)<\/option>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}