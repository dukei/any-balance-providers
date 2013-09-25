/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://www.popunder.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	if(!prefs.login)
		throw new AnyBalance.Error('Введите логин!');
	if(!prefs.password)
		throw new AnyBalance.Error('Введите пароль!');
		
	var	html = AnyBalance.requestPost(baseurl + 'main/auth/', {
		login:prefs.login,
        pass:prefs.password,
		x:30,
		y:22,
		authsubmit:'Вход'
    }, addHeaders({Referer: baseurl + 'login'}));
	
	if(!/logout/i.test(html)) {
		var error = getParam(html, null, null, /class="pcb"[^>]*><h1>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    var result = {success: true};
	getParam(html, result, 'balance', /Ваш баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'today', /Доход сегодня:[\s\S]*?<td[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}