
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Encoding':'gzip, deflate, sdch',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.86 Safari/537.36'
};

// для генерирования salt2 при авторизации
// на сайте делается так
// md5("qw"+Math.random(15000)).substr(0, 5);
// но для этого пришлось бы подключать большую функцию md5
// однако тут все равно рандом, поэтому решил так сделать
function randstr(len) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for( var i=0; i < len; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://delston-capital.com';
	AnyBalance.setDefaultCharset('utf-8');
	AnyBalance.setCookie('delston-capital.com', 'lang', 'ru');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var form = getElement(html, /<form[^>]*login[^>]*>/i);
	if(!form) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error("На странице не найдена форма входа. Сайт изменен?");
	}

	var params = createFormParams(form, function(params, str, name, value){
		if(name == 'login') 
			return prefs.login;
		if(name == 'password') 
			return prefs.password;
		if(name == 'salt2') 
			return randstr(5);
		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + '/ajax/usersinv/login/', params, addHeaders({
		'Accept':'application/json, text/javascript, */*; q=0.01',
		'X-Requested-With': 'XMLHttpRequest',
		'Origin': baseurl,
		'Referer': baseurl + '/'
	}));

	var json = getJson(html);

	if (!json.success) {
		var error = json.message;
		if (error)
			throw new AnyBalance.Error(error, null, /введены неверно/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + '/ru/cabinet/', g_headers);

	if(!/logout/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error("Авторизация не прошла. Сайт изменен?");
	}

	var result = { success: true };

	getParam(html, result, 'balance', /баланс:(?:[^>]*>){2}([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'affiliate', /Партнёрский счёт:(?:[^>]*>){2}([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'invested', /Инвестировано:(?:[^>]*>){2}([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'output', /Ожидают вывода:(?:[^>]*>){2}([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /Статус:(?:[^>]*>){1}([\s\S]*?)</i, replaceTagsAndSpaces);
	getParam(html, result, 'account_num', /Номер счёта:(?:[^>]*>){1}([\s\S]*?)</i, replaceTagsAndSpaces);
	getParam(html, result, 'curator', /Куратор:(?:[^>]*>){1}([\s\S]*?)</i, replaceTagsAndSpaces);

	html = getElement(html, /<div\b[^>]*id="personal_information"[^>]*>/i);
	html = getElement(html, /<td[^>]*>/i);
	
	getParam(html, result, 'name', null, replaceTagsAndSpaces);

	AnyBalance.setResult(result);

}