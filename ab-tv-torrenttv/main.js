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
	var baseurl = 'http://torrent-tv.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestPost(baseurl + 'auth.php', {
		email: prefs.login,
		password: prefs.password,
		enter: 'Войти'
	}, addHeaders({Referer: baseurl + ''}));

	if (!/document\.location="cabinet\.php"/i.test(html)) {
		var error = getParam(html, null, null, /"alert alert-error"(?:[^>]*>){4}([\s\S]*?)<\/div/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	html = AnyBalance.requestGet(baseurl + 'c_iptv.php', addHeaders({Referer: baseurl + 'auth.php'}));

	var result = {success: true};
	
	getParam(html, result, 'balance', /Баланс лицевого счета:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'deadline', /Текущая подписка:(?:[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);

	AnyBalance.setResult(result);
}