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
	var baseurl = 'http://kinomax.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	if(!prefs.login)
		throw new AnyBalance.Error('Введите логин!');
	if(!prefs.password)
		throw new AnyBalance.Error('Введите пароль!');
		
	var html = AnyBalance.requestPost(baseurl + 'index2.php?r=lk/login', {
        'LoginForm[username]':prefs.login,
        'LoginForm[password]':prefs.password,
        'login_submit.x':38,
		'login_submit.y':7,
	}, addHeaders({Referer: baseurl + 'index2.php?r=lk/login'}));
	
	if(!/editprofile/i.test(html)) {
		var error = getParam(html, null, null, /class="error-flash"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	if(isAvailable(['card', 'name'])) {
		html = AnyBalance.requestGet(baseurl + 'index2.php?r=lk/multicard', g_headers);
		getParam(html, result, 'card', /<strong>Карта (\d+)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'name', /<strong>Карта \d+<\/strong>[^\(]*\(([^\)]*)/i, replaceTagsAndSpaces, html_entity_decode);
	}

	if(isAvailable(['level', 'accum', 'active'])) {
		html = AnyBalance.requestGet(baseurl + 'index2.php?r=lk/cardinfo&_=1380012900366', g_headers);
		getParam(html, result, 'level', /Мультикарта (\d+)%/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'accum', /Накопительный баланс:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'active', /Активный баланс:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	}
	
    AnyBalance.setResult(result);
}