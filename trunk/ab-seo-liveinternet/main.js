/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.62 Safari/537.36',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://www.liveinternet.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'stat/', g_headers);

	html = AnyBalance.requestPost(baseurl + 'stat/', {
        url:prefs.login,
        password:prefs.password,
		rnd:getParam(html, null, null, /hidden[^>]*name=rnd[^>]*value="([^"]*)/i),
		ok:' OK '
    }, addHeaders({Referer: baseurl + 'stat/'})); 

    if(!/logout/i.test(html)){
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'views', /<label\s*for="id_[^>]*>Просмотры<\/label>(?:[\s\S]*?<[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'views_diff', /<label\s*for="id_[^>]*>Просмотры<\/label>(?:[\s\S]*?<[^>]*>){5}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'viewers', /<label for="id_[^>]*>Посетители<\/label>(?:[\s\S]*?<[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'viewers_diff', /<label for="id_[^>]*>Посетители<\/label>(?:[\s\S]*?<[^>]*>){5}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	result.__tariff = prefs.login;
	
    AnyBalance.setResult(result);
}