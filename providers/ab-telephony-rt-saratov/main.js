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
    var baseurl = 'https://webcab.san.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 
	
    var html = AnyBalance.requestGet(baseurl + 'personcab/abonent.pcTlfLogin.cls', g_headers);
	
    var Method = getParam(html, null, null, /cspHttpServerMethod\("([\s\S]*?)"/i, null, html_entity_decode);
    if(!Method)
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');

	html = AnyBalance.requestPost(baseurl + 'personcab/%25CSP.Broker.cls', {
		'WARGC':'9',
		'WARG_1':'abonent.pcTlfLogin',
		'WARG_2':'Login',
		'WARG_3':'BOOLEAN',
		'WARG_4':'1',
		'WARG_5':'',
		'WARG_6':'',
		'WARG_7':'L,L,L',
		'WARG_8':prefs.login + '' + prefs.password + '' + '1',
		'WARG_9':'INTERNET',
		'WEVENT':Method	
	}, addHeaders({Referer: baseurl + 'login', Origin:baseurl})); 

	html = AnyBalance.requestGet(baseurl + 'personcab/abonent.pcStartPage.cls', g_headers);
	
    if(!/abonent\.pcExit\.cls/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'fio', /Абонент:\s*([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'accnum', /Лицевой счет:\s*(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
	html = AnyBalance.requestGet(baseurl + 'personcab/abonent.pcTlfStat.cls', g_headers);
	getParam(html, result, '__tariff', /Тариф[\s\S]*?"row1">\s*<td>\d+<\/td>\s*<td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	
	
	var table = getParam(html, null, null, /Баланс лицевого счета по поставщикам услуг[\s\S]{1,50}(<table id='htmlTable'[\s\S]*?<\/table>)/i, null, html_entity_decode);
	if(table)
	{
		getParam(table, result, 'balance', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	}
    AnyBalance.setResult(result);
}