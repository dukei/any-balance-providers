/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 	'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 	'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 		'keep-alive',
	'User-Agent': 		'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://www.krasguk.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'cabinet', g_headers);

	html = AnyBalance.requestPost(baseurl + 'cabinet', {
		account_num: prefs.login,
		password: prefs.password,
		auth: 'Войти'
	}, addHeaders({
		Referer: baseurl + 'cabinet'
		}));

	if (!/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /jalert\("([^"]*)/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /проверьте правильность/i.test(error));

		}
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'cabinet?info=&p=info', addHeaders({
		'X-Requested-With': 'XMLHttpRequest'
	}));
	
	var json = getJson(html);
	
	var result = {success: true};
	
	getParam(json.html, result, 'balance', /Баланс лицевого счета(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(json.html, result, 'acc_num', /Номер личного счета(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}