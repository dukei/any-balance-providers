/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.62 Safari/537.36',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://vsetv.org/';
    AnyBalance.setDefaultCharset('utf-8'); 
	
    var html = AnyBalance.requestGet(baseurl + 'action.php', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'ajax.php', {
        userLogin:prefs.login,
        userPasswd:prefs.password,
        ajaxAction:'makeUserAuth'
    }, addHeaders({Referer: baseurl + 'action.php'})); 
	
    if(!/document\.location\.href='action\.php'/i.test(html)){
        var error = getParam(html, null, null, /([^\/]*)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	html = AnyBalance.requestGet(baseurl + 'action.php', g_headers);
	
    var result = {success: true, all: ''};
	getParam(html, result, 'balance', /баланс[^>]*<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /баланс[^>]*<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseCurrency);
	
	if(isAvailable(['till', 'all'])) {
		html = AnyBalance.requestGet(baseurl + 'action.php?type=myPackages', g_headers);
		var table = getParam(html, null, null, /<table(?:[^>]*>){4}Мои(?:&nbsp;| )пакеты[\s\S]*?<\/table>/i);
		if(!table)
			AnyBalance.trace('Не нашли таблицу с пакетами, сайт изменен?');
		
		var activePacks = sumParam(table, null, null, /(<tr>\s*<td\s*>[\s\S]*?<\/tr>)/ig);
		
		for(i = 0; i < activePacks.length; i++) {
			var tmp = getParam(activePacks[i], null, null, /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
			
			result.all += getParam(activePacks[i], null, null, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode)
			+ ' истекает: ' + getParam(activePacks[i], null, null, /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode)
			+ (tmp ? ' (' +  tmp + ')' : '')+ '\n';

			sumParam (activePacks[i], result, 'till', /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_min);			
		}
	}
    AnyBalance.setResult(result);
}