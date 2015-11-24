/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Connection': 'keep-alive',
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.86 Safari/537.36',
	'Content-Type': 'application/x-www-form-urlencoded',
	'Accept-Encoding': 'gzip, deflate',
	'Accept-Language': 'en-US,en;q=0.8'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.smartutilities.com.mt/wps/portal/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'Public%20Area/wps.Login/!ut/p/b1', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	// var params = createFormParams(html, function(params, str, name, value) {
	// 	if (name == 'username') 
	// 		return prefs.login;
	// 	else if (name == 'password')
	// 		return prefs.password;

	// 	return value;
	// });
    var params = {
    	'wps.portlets.userid': prefs.userid,
    	'password'=prefs.password,
    	'ns_Z7_CGAH47L008LG50IAHUR9Q330U1__login': 'Login'
    }
	html = AnyBalance.requestPost(baseurl + 'Public%20Area/wps.Login/!ut/p/b1', params, addHeaders({Referer: baseurl + 'login.html'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /[^>]+class="error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль|Имя пользователя и пароль не совпадают/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
    html = AnyBalance.requestGet(baseurl + 'moi-zakazay.html', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'order', /Заказ\s№(\d*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'date', /(?:Заказ\s№[^>]*>)([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', /Статус[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'sum', /Общая сумма([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}