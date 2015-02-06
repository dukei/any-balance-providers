/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://cab.kamensktel.ru/';
	AnyBalance.setDefaultCharset('KOI8-R');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'main', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'main', {
        'auth': '1',
        'ls': prefs.login,
        'pswd': prefs.password,
        'pswd2': ''
	}, addHeaders({Referer: baseurl + 'main'}));
	
	if (!/Выход/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /баланс:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /Здравствуйте,(?:[^>]*>){1}([\s\S]*?)!/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'acc_num', /Текущий номер лицевого счета:(?:[^>]*>){1}([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'paid', /Денег потрачено с начала месяца:(?:[^>]*>){1}([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /Ваш текущий тарифный план(?:[^>]*>){1}([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}