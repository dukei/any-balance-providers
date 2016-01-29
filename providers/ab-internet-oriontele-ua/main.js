/**
 * Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
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
	var baseurl = 'https://my.oriontele.com.ua/';
	AnyBalance.setDefaultCharset('utf-8');
	
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var params = {
        'login': prefs.login,
        'password': prefs.password,
        'Submit.x': '40',
        'Submit.y': '24'
    };
	
	html = AnyBalance.requestPost(baseurl + 'login', params, AB.addHeaders({Referer: baseurl + 'login'}));
	
	if (!/logout/i.test(html)) {
		if (/id="login_error"/i.test(html))
			throw new AnyBalance.Error('Неверный логин или пароль', null, true);
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	AB.getParam(html, result, 'balance', /баланс[\s\S]*?<td>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'agreement', /договор([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'cost', /підсумок за послуги[\s\S]*?<td>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, '__tariff', /тариф[\s\S]*?<i>([\s\S]*?)<\/i>/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'status', /статус послуги[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}