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
	var baseurl = 'http://clevercard-omsk.ru/personal/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + '', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + '?login=yes', {
			AUTH_FORM:	'Y',
			TYPE:	'AUTH',
			backurl:	'/personal/',
			USER_LOGIN:	prefs.login,
			USER_PASSWORD: prefs.password,
			Login:	'Войти'
	}, addHeaders({Referer: baseurl}));
	
	if (!/Операции по карте/i.test(html)) {

		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменён?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /<h2[^>]+?class="b_card_balance[\s\S]*?>[\s\S]*?<\/h2>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /<h1[^>]+?class="b_page_title[\s\S]*?>[\s\S]*?<\/h1>/i, replaceTagsAndSpaces, html_entity_decode);

	
	AnyBalance.setResult(result);
}