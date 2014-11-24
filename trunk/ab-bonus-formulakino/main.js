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

function main () {
    var prefs = AnyBalance.getPreferences ();
    var baseurl = 'http://www.formulakino.ru/';
	
    checkEmpty (prefs.login, 'Введите логин');
    checkEmpty (prefs.password, 'Введите пароль');
	
	var html = AnyBalance.requestGet(baseurl + 'territory-movie', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	html = AnyBalance.requestPost(baseurl + 'territory-movie/', {
		'sessid':getParam(html, null, null, /<form[^>]*action="\/territory-movie[^>]*>[^>]*value="([^"]+)/i),
		'card':prefs.login,
		'pin':prefs.password,
		'login':'ВОЙТИ'
	}, addHeaders({Referer: baseurl + 'territory-movie/'}));
	
	if (!/logout=yes/i.test(html)) {
		var error = getParam(html, null, null, / class="errortext"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Проверьте правильность номера карты и PIN/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

    var result = {success: true};
	
	getParam(html, result, 'balance', /Текущие накопления на карте:([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonus', /Бонус (\d+)%/i, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult (result);
}