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

    var baseurl = 'http://www.zebratelecom.ru/services/';
 	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
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
		var error = getParam(html, null, null, /<p[^>]*style="color:\s*red;"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
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