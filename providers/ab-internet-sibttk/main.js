/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	// Mobile
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	// Desktop
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://bill.sibttk.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	if(!prefs.login)
		throw new AnyBalance.Error('Введите логин!');
	if(!prefs.password)
		throw new AnyBalance.Error('Введите пароль!');
		
	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'login', {
		'wgga2j':'0',
		'xgga2j':'true',
		redirect:'',
		'login_remoteevdf7j':prefs.login,
		'password_remotefvdf7j':prefs.password,
		'action.remote_login.hdga2j.x':'4',
		'action.remote_login.hdga2j.y':'8',
    }, addHeaders({Referer: baseurl + 'login'}));
	
	if(!/лицевой счет/i.test(html)) {
		var error = getParam(html, null, null, /class="error"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    var result = {success: true};
	getParam(html, result, 'balance', /Итого на(?:[^>]*>){3,4}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'acc_num', /Лицевой счет(?:[^>]*>){6}([\d]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', /Наименование клиента(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}