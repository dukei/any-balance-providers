/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
    'X-Requested-With':'XMLHttpRequest'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://dnk.by/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');

   	html = AnyBalance.requestGet(baseurl + 'fancyajax/authForm.php?FORM=Y&BACKURI=%2F&FANCYAJAX=Y&_=' + (+new Date()));
   	var form = getElement(html, /<form/i);

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'USER_LOGIN') {
			return prefs.login;
		} else if (name == 'USER_PASSWORD') {
			return prefs.password;
		}

		return value;
	});

	html = requestPostMultipart(baseurl + 'fancyajax/authForm.php?login=yes', params, addHeaders({Referer: baseurl}));
    
	if (!/Подождите секундочку/i.test(html)) {
		var error = getElement(html, /<div[^>]+error_msg/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    html = AnyBalance.requestGet(baseurl + 'personal/', g_headers);
    
	var result = {success: true};
	
	getParam(html, result, 'account', /<div[^>]+client_card_num[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);

	var joinSpace = create_aggregate_join(' ');
	
	sumParam(html, result, 'name', /<div[^>]+label[^>]*>\s*Имя[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, null, joinSpace);
	sumParam(html, result, 'name', /<div[^>]+label[^>]*>\s*Отчество[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, null, joinSpace);
	sumParam(html, result, 'name', /<div[^>]+label[^>]*>\s*Фамилия[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, null, joinSpace);

	getParam(html, result, 'balance', /Накопленная сумма на карте:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonus', /Доступная накопленная сумма баллов:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'last_buy', /Дата последней покупки: ([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseDate);
	
	AnyBalance.setResult(result);
}