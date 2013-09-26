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
    var baseurl = 'http://users.v8.1c.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl, g_headers);

	html = AnyBalance.requestPost(baseurl, {
        user:prefs.login,
        password:prefs.password,
        enteringButton:'Войти'
    }, addHeaders({Referer: baseurl + 'login'})); 

    if(!/logout\.jsp/i.test(html)){
        var error = getParam(html, null, null, /"errLabel"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    html = AnyBalance.requestGet(baseurl + 'personal.jsp', g_headers);
	
	if(/Нет подписки на ИТС/i.test(html))
		throw new AnyBalance.Error('На данный момент нет активных подписок на ИТС');
	

    var result = {success: true};
    getParam(html, result, 'date', /подписка\s*действует\s*до([^<]*)/i, replaceTagsAndSpaces, parseDate);

    AnyBalance.setResult(result);
}