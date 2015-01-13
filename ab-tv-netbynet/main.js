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
	var baseurl = 'https://selfcare.netbynet.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'ott/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	html = AnyBalance.requestPost(baseurl + 'ott/?', {
    	'pr[form][auto][form_save_to_link]': 0,
    	'pr[form][auto][login]': prefs.login,
    	'pr[form][auto][password]': prefs.password,
    	'pr[form][auto][form_event]': 'Войти'
	}, addHeaders({Referer: baseurl + 'ott/'}));
	
	if (!/'\?exit=1'/i.test(html)) {
		var error = getParam(html, null, null, /<font[^>]+color=['"]red['"][^>]*>([\s\S]*?)<\/font>/ig, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неправильный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /баланс:(?:[^>]*>){2}([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'payment', /Ежемесячная абонентская плата:(?:[^>]*>){2}([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /Приветствуем Вас,([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'acc', /<b>\s*Лицевой счет:(?:[^>]*>){2}([^<,]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', /Текущий статус договора:(?:[^>]*>){2}([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
	
    html = AnyBalance.requestGet(baseurl + 'ott/?pr%5Bcontrol%5D%5Bkernel%5D%5Brecord%5D=245&pr%5Bcontrol%5D%5Bkernel%5D%5Bparent%5D=19&menu=19', g_headers);
    
	getParam(html, result, '__tariff', /Тариф(?:[^>]*>){16}([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
    
	AnyBalance.setResult(result);
}