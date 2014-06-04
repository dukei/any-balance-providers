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
    var baseurl = 'https://dashboard.marketgid.com/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'user/signin', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'user/signin', {
        login:prefs.login,
        password:prefs.password,
        signin:'Войти'
    }, addHeaders({Referer: baseurl + 'user/signin'})); 
	
    if(!/user\/signout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    
	var result = {success: true};
	
	getParam(html, result, 'balance', />\s*Нераспределенный заработок:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance_total', />\s*Общий заработок:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'balance30', />\s*Заработок за 30 дней:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	
	
	/*
	getParam(html, result, 'wallet', /МГ-кошелёк[^<]*<[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency','balance'], /Заработок[^<]*<[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseCurrency);
	// Клики
	getParam(html, result, 'clicks', /Итого по выбранным информерам(?:[\s\S]*?<td[^>]*>){2}\s*([\s\S]*?)\s*<\/td>/i, replaceTagsAndSpaces, parseBalance);
	// Показы
	getParam(html, result, 'shows', /Итого по выбранным информерам(?:[\s\S]*?<td[^>]*>){3}\s*([\s\S]*?)\s*<\/td>/i, replaceTagsAndSpaces, parseBalance);
	// CTR
	getParam(html, result, 'ctr', /Итого по выбранным информерам(?:[\s\S]*?<td[^>]*>){4}\s*([\s\S]*?)\s*<\/td>/i, replaceTagsAndSpaces, parseBalance);
	//CPM
	getParam(html, result, 'cpm', /Итого по выбранным информерам(?:[\s\S]*?<td[^>]*>){5}\s*([\s\S]*?)\s*<\/td>/i, replaceTagsAndSpaces, parseBalance);
	//За клик
	getParam(html, result, 'forclick', /Итого по выбранным информерам(?:[\s\S]*?<td[^>]*>){6}\s*([\s\S]*?)\s*<\/td>/i, replaceTagsAndSpaces, parseBalance);
	//Заработок
	getParam(html, result, 'earnings', /Итого по выбранным информерам(?:[\s\S]*?<td[^>]*>){7}\s*([\s\S]*?)\s*<\/td>/i, replaceTagsAndSpaces, parseBalance);
*/
    AnyBalance.setResult(result);
}