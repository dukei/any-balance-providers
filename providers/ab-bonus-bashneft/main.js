/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.80 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://bashneft-azs.ru/';
	AnyBalance.setDefaultCharset('windows-1251');
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	AnyBalance.restoreCookies();
	var html = AnyBalance.requestGet(baseurl + 'loyalty/personal/', g_headers);
if (!/Выход/i.test(html)) {
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
                clearAllCookies();
		AnyBalance.saveData();
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
        var recaptcha=getParam(html, /data-sitekey="([^"]*)/i, replaceHtmlEntities);
	if(recaptcha){
	    var g_recaptcha_response = solveRecaptcha("Пожалуйста, докажите, что Вы не робот", AnyBalance.getLastUrl(), recaptcha);
	}else{
		AnyBalance.trace('Капча не требуется, ура');
	}

	html = AnyBalance.requestPost(baseurl + 'loyalty/personal/', {
		userLoginForm_login: prefs.login,
		userLoginForm_pswrd: prefs.password,
                'g-recaptcha-response':g_recaptcha_response
	}, addHeaders({Referer: baseurl + 'loyalty/personal/'}));
	
	if (!/Выход/i.test(html)) {
		if(/Технические работы/i.test(html))
			throw new AnyBalance.Error('Личный кабинет временно не доступен в связи с проводимыми техническими работами.');

		var error = getParam(html, null, null, /<div\s+class="error_block">([\s\S]+?)<\/div>/i, replaceTagsAndSpaces);
		if (error) {
                	clearAllCookies();
                	AnyBalance.saveData();
                	throw new AnyBalance.Error(error, null, /данные неверны!/i.test(error));
		}
		
		AnyBalance.trace(html);
                clearAllCookies();
		AnyBalance.saveData();
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
}	
	AnyBalance.saveCookies();
	AnyBalance.saveData();
	var result = {success: true};
	
	getParam(html, result, 'balance', /Ваш баланс[\s\S]*?<div[^>]*>([\s\S]+?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /<div\s+class="lk_left_info_block">[\s\S]*?<div\s+class="text">([\s\S]+?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'cardNumber', /Ваша карта[\s\S]*?<div[^>]*>№?([\s\S]+?)<\/div>/i, replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}