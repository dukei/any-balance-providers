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
    var baseurl = 'http://api.qip.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 
	
	var encodedLogin = encodeURIComponent(prefs.login);
	var encodedPass = encodeURIComponent(prefs.password);

	var html = AnyBalance.requestGet(baseurl+'api/test?user='+encodedLogin+'&pass='+encodedPass+'&retpath=http%3A%2F%2Fvoip.qip.ru%2Findex%2F%3Flogin%3D'+encodedLogin, g_headers); 

    if(!/api\.qip\.ru\/api\/logout?/i.test(html)){
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    var result = {success: true};
	getParam(html, result, 'sipid', /Ваш счёт[\s\S]*?(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Ваш счёт[\s\S]*?(-?\d[\d\s]*[.,]?\d*) руб/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}