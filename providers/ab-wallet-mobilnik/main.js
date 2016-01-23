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

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://wallet.mobilnik.kg/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var form = getElement(html, /<form[^>]+id="login_form"[^>]*>/i);
	if(!form) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа, сайт изменен?');
	}
	
	var params = createFormParams(form, function(params, str, name, value) {
		if (name == 'login') 
			return prefs.login;
		else if (name == 'passwd')
			return prefs.password;
		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'login', params, addHeaders({ Referer: baseurl, Origin: baseurl }));
	
	if (!/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /<div[^>]*class="[^\"]*error[^\"]*">([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Пользователь не найден|Неправильный логин\/пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	AB.getParam(html, result, 'balance', /Баланс:([\s\S]*?)<\/dd>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'account_num', /Лицевой счет:([\s\S]*?)<\/dd>/i, AB.replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}