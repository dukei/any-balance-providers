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

function redirectIfNeeded(html){
    var re = /<meta[^>]+http-equiv="refresh"[^>]+content="\d+;\s+url=([^"]*)/i;
	do{
		var url = getParam(html, re, replaceHtmlEntities);
		if(url){
			url = joinUrl(AnyBalance.getLastUrl(), url);
			AnyBalance.trace("Redirecting to " + url);
			html = AnyBalance.requestGet(url, addHeaders({Referer: AnyBalance.getLastUrl()}));
		}
	}while(re.test(html));
	return html;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://infoshkola.net/';
	
    var html = AnyBalance.requestGet(baseurl, g_headers);

    html = AnyBalance.requestPost(baseurl + 'custom/auth', {
        login:prefs.login,
        password:prefs.password,
    }, addHeaders({Referer: baseurl}));

    html = redirectIfNeeded(html);
	
    if(!/quit/i.test(html)){
        var error = getElement(html, /<div[^>]+align="center"/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /не\s*верные/i.test(error));
		
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
	AnyBalance.setOptions({forceCharset: 'utf-8'});
	
    var result = {success: true};
	
    getParam(html, result, 'balance', /Остаток на счете:([\s\S]*?)руб/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'acc_type', /Тип счета:(?:[\s\S]*?<[^>]*>)([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result, 'dogovor', /Договор:([\s\S]*?)(?:<a|<\/p>)/i, replaceTagsAndSpaces);
	getParam(html, result, 'fio', /Абонент:(?:[\s\S]*?<[^>]*>)([\s\S]*?)<\//i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', />\s*Тариф:([\s\S]*?)<\/span/i, replaceTagsAndSpaces);
	
    AnyBalance.setResult(result);
}