/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html, */*; q=0.01',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://www.norcom.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
		
	var html = AnyBalance.requestGet(baseurl + '', g_headers);
	
	html = AnyBalance.requestGet(baseurl + 'profile?act=login&lg_login='+ encodeURIComponent(prefs.login)+'&lg_password='+ encodeURIComponent(prefs.password), addHeaders({'X-Requested-With':'XMLHttpRequest'}));
	
	html = AnyBalance.requestGet(baseurl + 'profile?r='+Math.random(), addHeaders({'Referer':baseurl}));
	
	if(!/Выйти из профиля/i.test(html)) {
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};
	
	getParam(html, result, 'accnum', /Лицевой счёт:[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Ваш Баланс:[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'traf', /Трафик за месяц:(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, parseTraffic);
	
    AnyBalance.setResult(result);
}