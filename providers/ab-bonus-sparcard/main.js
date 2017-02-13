/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('UTF-8');
	
	if (!prefs.auth_cnumber)
        	throw new AnyBalance.Error('Введите номер карты!');
	if (!prefs.auth_password)
		throw new AnyBalance.Error('Введите пароль!');
	
	var baseurl = 'https://card.spar-nn.ru/';

    var html = AnyBalance.requestGet(baseurl + 'site/login', g_headers);
	var sitekey = getParam(html, /data-sitekey="([^"]*)/i, replaceHtmlEntities), recaptcha;
	if(sitekey){
		AnyBalance.trace('Потребовалась рекапча');
		recaptcha = solveRecaptcha('Пожалуйста, подтвердите, что вы не робот!', baseurl + 'site/login', sitekey);
	}
		
	html = AnyBalance.requestPost(baseurl + 'site/login', {
		'LoginForm[redirect]':'/user',
		'LoginForm[login]':prefs.auth_cnumber,
		'LoginForm[password]':prefs.auth_password,
		'LoginForm[rememberMe]':'0',
		'g-recaptcha-response': recaptcha,
		'yt0':'Вход'
	}, addHeaders({Referer: baseurl}));
	
	if (!/leftexit/i.test(html)){
		var error = getElement(html, /<div[^>]+errorMessage/i, replaceTagsAndSpaces);
		if(error)
			throw new AnyBalance.Error(error, null, /парол|логин/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl + 'user', g_headers);

	var result = {success: true};

	getParam(html, result, '_tariff', /<span[^>]+lkuicard[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'card_bonus', /<span[^>]+lkuibalance[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
}
