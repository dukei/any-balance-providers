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
    var baseurl = 'https://cabinet.telphin.ru/';
    AnyBalance.setOptions({FORCE_CHARSET: 'utf-8'}); 

    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

    var html = AnyBalance.requestPost(baseurl + 'login', {
        'LoginForm[username]':prefs.login,
        'LoginForm[password]':prefs.password,
        yt0: 'Войти'
    }, g_headers); 
	
    if(!/logout/i.test(html)){
        var error = sumParam(html, /<div[^>]+errorMessage[^>]*>([\s\S]*?)<\/div>/ig, replaceTagsAndSpaces, null, aggregate_join);
        if(error)
            throw new AnyBalance.Error(error, null, /парол/i.test(error));
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'balance', /<span[^>]+balance-cost[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet', /Код клиента:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
    AnyBalance.setResult(result);
}