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
	var baseurl = 'https://fidomarket.ua/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	try {
		AnyBalance.restoreCookies();
	} catch(e) {}
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	// Первая авторизация. Если  сохранить куки, то не должно просить ввод смс кода
	if(!/href="\/c\/portal\/logout"/i.test(html)) {
		AnyBalance.trace('Нужен код и авторизация...');
		
		html = AnyBalance.requestPost(baseurl + 'home-page?p_p_id=loginportlet_WAR_fidoportlet&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=processRegistrationUrl&p_p_cacheability=cacheLevelPage', {
			'phone': prefs.login,
			'password': prefs.password,
			'command': 'AUTHORIZATION',
			'step': 'AUTHORIZATION_STEP1',
		}, addHeaders({Referer: baseurl + ''}));
		
		var sms;
		if(AnyBalance.getLevel() >= 7) {
			AnyBalance.trace('Ждем смс...');
			sms = AnyBalance.retrieveCode("Пожалуйста, введите код из смс.");
			AnyBalance.trace('Код получен: ' + sms);
		}else{
			throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
		}
		
		html = AnyBalance.requestPost(baseurl + 'home-page?p_p_id=loginportlet_WAR_fidoportlet&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=processRegistrationUrl&p_p_cacheability=cacheLevelPage', {
			'confirmType': 'AUTHORIZATION',
			'phone': prefs.login,
			'password': prefs.password,
			'command': 'AUTHORIZATION',
			'step': 'AUTHORIZATION_STEP2',
			'sms': sms,
		}, addHeaders({Referer: baseurl + ''}));
		
		if (!/\\"key\\":\\"redirect\\",\\"value\\":\\"https:\/\/fidomarket.ua\/\\"/i.test(html)) {
			var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
			if (error)
				throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
			
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
		
		AnyBalance.trace('Успешно ввели код из смс и авторизовались в кабинете...');
	}
	
	html = AnyBalance.requestGet(baseurl + 'my-money', g_headers);
	
	var account = getParam(html, null, null, new RegExp('class="nameProd"((?:[^>]*>){4,10}' + (prefs.account || '\\d{4}') + '(?:[^>]*>){1}[^>]*"prodBalance"(?:[^>]*>){3}</div>)', 'i'));
	
	if(!account) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.account ? 'счет с последними цифрами ' + prefs.account : 'ни одного счета!'));
	}
	
	var result = {success: true};
	
	getParam(account, result, 'name', /"prod_founds"[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(account, result, 'acc_num', /"prodPercent"[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(account, result, '__tariff', /"prodPercent"[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(account, result, 'balance', /"prodBalance"[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(account, result, ['currency', 'balance'], /"prodBalance"[^>]*>((?:[^>]*>){2})/i, replaceTagsAndSpaces, parseCurrency);
	
	AnyBalance.saveCookies();
	AnyBalance.saveData();
	AnyBalance.setResult(result);
}