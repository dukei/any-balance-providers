
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
	var baseurl = 'https://accounts.dns-shop.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	var form = AB.getElement(html, /<form/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа! Сайт изменен?');
	}

	var key = getParam(form, /data-sitekey="?([^"\s>]*)/i, replaceHtmlEntities);
	var captcha;
	if(key)
		captcha = solveRecaptcha("Пожалуйста, докажите, что вы не робот", AnyBalance.getLastUrl(), key);

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'Method') {
			return /@/i.test(prefs.login);
		} else if (name == 'Login') {
			return prefs.login;
		} else if (name == 'password') {
			return prefs.password;
		}

		return value;
	});

	params['g-recaptcha-response'] = captcha;

	html = AnyBalance.requestPost(baseurl + 'login', params, AB.addHeaders({
		Referer: baseurl + 'login'
	}));

	if(/policy-btn/i.test(html)){
		//Надо подтвердить согласие с политикой
		AnyBalance.trace('Подтверждаем согласие с политикой конфиденциальности');
		html = AnyBalance.requestPost(AnyBalance.getLastUrl(), {
			agreeWithPolicy: 'true'
		}, AB.addHeaders({
			Referer: baseurl + 'login'
		}));
	}

	if (!/logout/i.test(html)) {
		var error = getElement(html, /<div[^>]+class="error"/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	html = AnyBalance.requestGet('https://www.dns-shop.ru/profile/prozapass/', g_headers); 

	AB.getParam(getElement(html, /<div[^>]+bonus-active/i), result, 'balance', null, [AB.replaceTagsAndSpaces, /нет бонусов/i, '0'], AB.parseBalance);
	AB.getParam(getElement(html, /<div[^>]+bonus-no-active/i), result, 'inactive', null, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'till', /Дата сгорания:[\s\S]*?<div[^>]+bonus-count[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseDate);
	AB.getParam(html, result, 'fio', /<span[^>]+user-title[^>]*>([\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}
