/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Cache-Control': 'max-age=0',
	Connection: 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
};

var g_baseurl = 'https://bonus.ssl.mts.ru';

function main() {
	var prefs = AnyBalance.getPreferences();

	checkEmpty(prefs.login, 'Введите номер телефона');
	checkEmpty(prefs.password, 'Введите пароль');
	
	var html = enterMTS({login: prefs.login, password: prefs.password, service: 'bonus'});
	AnyBalance.trace('It looks like we are in selfcare...');

	var result = {success: true};

	html = AnyBalance.requestGet(g_baseurl + '/api/user/part/Status', addHeaders({Referer: g_baseurl + '/', 'X-Requested-With': 'XMLHttpRequest'}));
	var json = getJson(html);

	if(json.status == 'unavailable'){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Информация временно недоступна. Пожалуйста, попробуйте позже');
	}

	getParam(json.login, result, 'phone', null, [/7(\d\d\d)(\d\d\d)(\d\d)(\d\d)/, '+7($1)$2-$3-$4']);
	getParam(json.fullName, result, 'fio');
	getParam(json.fullName, result, '__tariff');

	html = AnyBalance.requestGet(g_baseurl + '/api/user/part/Points', addHeaders({Referer: g_baseurl + '/', 'X-Requested-With': 'XMLHttpRequest'}));
	json = getJson(html);
	getParam(json.points, result, 'balance');

	AnyBalance.setResult(result);
}