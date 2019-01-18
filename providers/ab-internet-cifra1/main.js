/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ru,en-US;q=0.8,en;q=0.6'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
	
    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');
	
	var baseurl = 'https://almatel.ru/';
	var html = AnyBalance.requestGet(baseurl + 'lk/login.php', g_headers);

	html = AnyBalance.requestPost(baseurl + 'lk/login.php', {
		login: prefs.login,
		password: prefs.password
	}, addHeaders({
		Accept: 'application/json, text/javascript, */*; q=0.01',
		'X-Requested-With': 'XMLHttpRequest',
		Referer: baseurl + 'lk/login.php'
	}));

	var json = getJson(html);

	if(!json.ok){
		if(json.error)
			throw new AnyBalance.Error(json.error, null, /неправильные данные|парол/i.test(json.error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl + 'lk/', g_headers);

	var result = {success: true};
	getParam(html, result, 'balance', /Остаток на счете:[\s\S]*?<span[^>]+question-block-value[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'agreement', /Договор №\s*([^<]+)/i, replaceTagsAndSpaces);
	getParam(html, result, 'status', /Статус[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
	getParam(html, result, 'bonus', /Накопленные бонусы:[\s\S]*?<span[^>]+question-block-value[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /<h6[^>]*>\s*Тарифный план[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}

