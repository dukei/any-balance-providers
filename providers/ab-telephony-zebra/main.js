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

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');    

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	if(prefs.type == 'main'){
		mainMain();
	}else{
		mainCard();
	}

}

function mainCard(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.trace('Используем кабинет для владельцев карт');

    var baseurl = 'https://www.zebratelecom.ru/services/';
 	
	var html = AnyBalance.requestGet(baseurl + 'cabinet', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}   
	
	html = AnyBalance.requestPost(baseurl + 'cabinet/check.php', {
		'fname': 'auth',
		'login': prefs.login,
		'pass': prefs.password,
	}, addHeaders({Referer: baseurl + 'cabinet'}));
	
	if (!/exit\.php/i.test(html)) {
		var error = getParam(html, null, null, /<p[^>]*style="color:\s*red;"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};

    getParam(html, result, 'balance', /<a[^>]*id="mcount"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'currency', /<a[^>]*id="mcount"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseCurrency);
    getParam(html, result, 'userName', /Пользователь:([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'licschet', /№ счета:([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /Пользователь:([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		
    AnyBalance.setResult(result);
}

function mainMain(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.trace('Используем основной кабинет');

    var baseurl = 'https://cabinet.zebratelecom.ru/';
 	
	var html = AnyBalance.requestGet(baseurl + 'intro/login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var form = AB.getElement(html, /<form[^>]+form-panel/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа! Сайт изменен?');
	}

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'email') {
			return prefs.login;
		} else if (name == 'pass') {
			return prefs.password;
		}

		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'intro/login', params, addHeaders({Referer: baseurl + 'intro/login'}));
	
	if (!/exit/i.test(html)) {
		var error = getElement(html, /<div[^>]+form-panel-status/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl + 'customer/accounts', addHeaders({Referer: AnyBalance.getLastUrl()}));
	
    var result = {success: true};

    getParam(html, result, 'balance', /<div[^>]+class="sum"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, ['currency', 'balance'], /<div[^>]+class="sum"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(html, result, 'licschet', /<div[^>]+class="title"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    getParam(html, result, 'userName', /<div[^>]+side-user__in[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /<div[^>]+side-user__in[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		
    AnyBalance.setResult(result);
}