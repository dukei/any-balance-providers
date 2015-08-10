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
    var baseurl = 'https://control.imena.ua/';
    AnyBalance.setDefaultCharset('utf-8'); 

	var html = AnyBalance.requestPost(baseurl + 'index.php', {
		'auth[lng]':'2',
        'auth[login]':prefs.login,
        'auth[password]':prefs.password,
        act:'do'
    }, addHeaders({Referer: baseurl + 'index.php'})); 

    if(!/logout\.php/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'fio', /class="user_info[\s\S]*?>[\s\S]*?class="sepH_a">\s*<strong>([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /class="user_info[\s\S]*?>[\s\S]*?class="price-balance">([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /Client ID:\s*([\s\S]*?)\s*\)/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}