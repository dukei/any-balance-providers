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
    var baseurl = 'https://cp.tsfin.ru/';
    AnyBalance.setDefaultCharset('windows-1251'); 

	var encodedLogin = encodeURIComponent(prefs.login);
	var encodedPass = encodeURIComponent(prefs.password);

    var html = AnyBalance.requestGet(baseurl+'login.php?login='+encodedLogin+'&password='+encodedPass+'&submit=%C2%EE%E9%F2%E8', g_headers);
	html = AnyBalance.requestGet(baseurl+'client.php?submenu=1', g_headers);

    if(!/\/Logout/i.test(html)){
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
	getParam(html, result, 'acc', /Лицевой счёт №:\s*(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Баланс:([\s\S]*?)руб/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'daily', /Средний дневной расход по договору([\s\S]*?)руб/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'monthly', /Прогноз расхода по договору([\s\S]*?)руб/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}