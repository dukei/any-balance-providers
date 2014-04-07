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
	var baseurl = 'https://fornex.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login/?next=/my/payment/', g_headers);
	
	var form = getParam(html, null, null, /Если Вы уже наш клиент[\s\S]{1,50}<form action="" method="post" id="login-form" class="form-horizontal">[\s\S]*?<\/form/i);
	checkEmpty(form, 'Не удалось найти форму входа, сайт изменен?', true);
	
	var params = createFormParams(form, function(params, str, name, value) {
		if (name == 'username') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'login/?next=/my/payment/', params, addHeaders({Referer: baseurl + 'login/?next=/my/payment/'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /alert-error([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /введите корректные имя пользователя и пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /class="ballance"([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /class="ballance"([^>]*>){2}/i, replaceTagsAndSpaces, parseCurrency);
	
	AnyBalance.setResult(result);
}