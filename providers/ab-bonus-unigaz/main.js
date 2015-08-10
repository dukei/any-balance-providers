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
	var baseurl = 'http://www.junigaz.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'component/azs/?view=kab', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'azs/index.php?Itemid=', {
		loginid: prefs.login,
		pass: prefs.password,
		option: 'com_azs',
		task: '',
		view: 'kab',
		controller: ''
	}, addHeaders({Referer: baseurl + 'component/azs/?view=kab'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /Вход в личный кабинет[^>]*>\s*<p[^>]+color:\s*red[^>]+>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Пользователь не найден/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Сумма рублевых накоплений(?:[^>]*>){4}\s*(<b>\d+<\/b>)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /Номер Вашей бонусной карты[^>]*>((?:[^>]*>){4})/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}