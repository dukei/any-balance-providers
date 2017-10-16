/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Данные по бонусной карте сети кинотеатров Киномакс.
Провайдер получает эти данные из личного Кабинета. Для работы требуется указать в настройках партнерские логин и пароль.

Сайт сети: http://kinomax.ru/
Личный кабинет: http://kinomax.ru/users/lk/dnk.htm
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
	var baseurl = 'https://kinomax.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	if(!prefs.login)
		throw new AnyBalance.Error('Введите логин!');
	if(!prefs.password)
		throw new AnyBalance.Error('Введите пароль!');
		
	var html = AnyBalance.requestPost(baseurl + 'lk/login', {
        'login':prefs.login,
        'password':prefs.password,
	}, addHeaders({Referer: baseurl}));
	var json = getJson(html);
	
	if(json.result != 'ok') {
		var error = json.message;
		if(error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl + 'lk/index');

	var result = {success: true};
	getParam(html, result, 'name', /<img[^>]+user.svg[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);

	html = AnyBalance.requestGet(baseurl + 'lk/cardinfo');

	getParam(html, result, 'status', /Статус Мультикарты:([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
	getParam(html, result, 'balance', /Баланс:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}