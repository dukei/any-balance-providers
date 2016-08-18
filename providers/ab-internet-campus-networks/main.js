/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.111 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://stat.campus-rv.net/';
	AnyBalance.setDefaultCharset('utf-8');
	
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
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
	
	html = AnyBalance.requestPost(baseurl + 'main.php', params, AB.addHeaders({
		Referer: baseurl
	}));
	
	if (!/exit/i.test(html)) {
		var error = AB.getParam(html, null, null, /<div[^>]+class="alert alert-danger"[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Логін або пароль невірний/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl+'main.php', g_headers);

	var result = {success: true};

	AB.getParam(html, result, '__tariff', /Тарифний план(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);

	AB.getParam(html, result, 'balance', /Інформація по рахунку(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'credit', /Інформація по рахунку(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'cost_tariff', /Тарифний план(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'cost_IP', /Інформація по рахунку(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'fio', /Дані користувача(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'UID', /Дані користувача(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'agreement_num', /Дані користувача(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'user_status', /Дані користувача(?:[\s\S]*?<td[^>]*>){8}([^>]*>){4}/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'turbo_status', /Інформація по рахунку(?:[\s\S]*?<td[^>]*>){10}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'internet_status', /Інформація по рахунку(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}