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
    var baseurl = 'https://www.turbosquid.com/';
    AnyBalance.setDefaultCharset('utf-8'); 
	
	var html = AnyBalance.requestPost(baseurl + 'Login/Index.cfm', {
        LoginUsername:prefs.login,
        LoginPassword:prefs.password,
        Action:'Login',
		Clnt:'1',
		stgRU:'http://www.turbosquid.com/',
    }, addHeaders({Referer: baseurl + 'login'})); 
	
    if(!/Аккаунт|Account/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	html = AnyBalance.requestPost(baseurl + 'Dashboard/Index.cfm', g_headers);
	//AnyBalance.trace(html);	
    var result = {success: true};
    getParam(html, result, 'balance', /dashbar-money">([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalanceMy);
	
	getParam(html, result, 'fio', /Имя(?:\s|&nbsp;)*абонента:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'phone', /Номер:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
    
    getParam(html, result, 'status', /Статус:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}
// Вернет баланс если он в виде 1.123.45
function parseBalanceMy(text){
	var encText = html_entity_decode(text).replace(/\s+/g, '');
	var val = getParam(encText, null, null, /(-?\d[\d.,]*)/, [/&minus;/ig, '-', /\s+/g, '', /[.,]/g, ''], parseFloat)/100;
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}