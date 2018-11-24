/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Данные по бонусной карте сети кинотеатров Киномакс.
Провайдер получает эти данные из личного Кабинета. Для работы требуется указать в настройках партнерские логин и пароль.

Сайт сети: http://kinomax.ru/
Личный кабинет: http://kinomax.ru/users/lk/dnk.htm
*/
var g_headers = {
	'Accept':			'application/json, text/javascript, */*; q=0.01',
	'Accept-Charset':	'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':	'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':		'keep-alive',
	'User-Agent':		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36',
	'X-Requested-With': 'XMLHttpRequest',
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

	html = AnyBalance.requestGet(baseurl + 'lk/index', g_headers);

	var result = {success: true};
	getParam(html, result, 'name', /Привет, ([^!]*)/i, replaceTagsAndSpaces);

	html = AnyBalance.requestGet(baseurl + 'lk/cardinfo', addHeaders({
		'X-Requested-With': 'XMLHttpRequest',
		'Accept': '*/*'
	}));

	getParam(html, result, 'status', /Статус Мультикарты:([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);

	getParam(html, result, 'balance', /баланс карты(?:[\s\S]*?)<div>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'percentage', /Бонус с покупок(?:[\s\S]*?)<div>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}