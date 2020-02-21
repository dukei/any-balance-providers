/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var baseurl = 'https://lk.quartztelecom.ru/';

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	'Referer': baseurl,
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

	html = AnyBalance.requestPost(baseurl + 'login', {
        username:prefs.login,
        passwd:prefs.password,
    }, addHeaders({Referer: baseurl + 'login'})); 

    if(!/\/Logout/i.test(html)){
        var error = getElement(html, /<span[^>]+action-label/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /парол/i.test(error));
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	html = AnyBalance.requestGet(baseurl + 'services/main', g_headers);
	
    var result = {success: true};
    
	getParam(html, result, 'fio', /<div[^>]*class="main-info__name"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'account', /Л\/сч:([^<]*)/i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /Тариф:([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'status', /<span[^>]+activity-label[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'balance', /<span[^>]+main-info__money-count[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}