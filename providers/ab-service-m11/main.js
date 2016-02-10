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

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://private.15-58m11.ru/onyma/';
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
	
	html = AnyBalance.requestPost(
        baseurl,
        params,
        AB.addHeaders({Referer: baseurl})
    );
	
	if (!/\/exit/i.test(html)) {
		var error = AB.getParam(html, null, null, /<ul class="errorlist">([\s\S]*?)<\/ul>/i, AB.replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверное имя или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	AB.getParam(html, result, 'balance', /Баланс[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'status', /Статус[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'contract', /Договор[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'fio', /ФИО[\s\S]*?<span[^>]*>([\s\S]*?)Контакты/i, [AB.replaceTagsAndSpaces, /RU/g, '']);
	AB.getParam(html, result, 'contacts', /Телефон:([\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}