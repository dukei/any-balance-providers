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
    var baseurl = "https://stat.maxnet.ru/";
    AnyBalance.setDefaultCharset('koi8-r'); 

    html = AnyBalance.requestPost(baseurl + 'cgi-bin/index.cgi', {
        username:prefs.login,
        password:prefs.password,
        action:'login'
    }, addHeaders({Referer: baseurl + 'cgi-bin/index.cgi'})); 

    if(!/action=logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'fio', /Частное лицо[\s\S]{1,10}<td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'acc_num', /Номер договора:[\s\S]{1,10}<td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'status', /Статус:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);	
	getParam(html, result, 'balance', /Баланс Вашего счета:[\s\S]*?b>([\s\S]*?)Руб/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'abon', /Абонентская плата[\s\S]*?<b no[\s\S]([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
	
	
	getParam(html, result, 'traf', /Трафик[\s\S]*?<td align=right>[\s\S]*?общий[\s\S]*?<td align=right>([\s\S]*?)Мб/i, replaceTagsAndSpaces, parseBalance);
	
	
	
	getParam(html, result, '__tariff', /Тарифный план[\s\S]*?select[\s\S]*?>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
    
    AnyBalance.setResult(result);
}