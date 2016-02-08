/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.103 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://my.oriontele.com.ua/';
	AnyBalance.setDefaultCharset('utf-8');
	
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var params = AB.createFormParams(html, function(params, str, name, value) {
		if (name == 'login') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'login', params, AB.addHeaders({
		Referer: baseurl + 'login'
	}));
	
	if (!/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /<div[^>]+id="login_error"[^>]*>[\s\S]*?<\/div>/i, AB.replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /логин и пароль не приняты системой/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	AB.getParam(html, result, 'balance', /баланс:(?:[^>]*>){2}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'cost', /за послуги:(?:[^>]*>){2}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, '__tariff', /тариф:(?:[^>]*>){2}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'status', /статус послуги:(?:[^>]*>){2}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'service', /послуга:(?:[^>]*>){2}([\s\S]*?)<\//i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'agreement', /<div[^>]+class="menu_dogovor_text"[^>]*>[^\d]*(\d+)<\/div>/i, AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}