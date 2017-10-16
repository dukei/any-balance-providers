/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':			'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':	'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':	'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':		'keep-alive',
	'User-Agent':		'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');
	
    var baseurl = "https://seopult.ru/";
    AnyBalance.setDefaultCharset('utf-8');

	var html = AnyBalance.requestGet(baseurl + 'user.html', g_headers);
	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

    html = AnyBalance.requestPost(baseurl + 'user.html', {
        uname:prefs.login,
        pass:prefs.password,
		pass_hash:'',
        op:'login'
    }, addHeaders({Referer: baseurl + 'user.html'}));
	
    if(!/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /<h4[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces);
		if(error)
			throw new AnyBalance.Error(error, null, /неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};
	
    AB.getParam(html, result, 'balance', 		 /id=['"]balance['"][^>]*>([^<]*)/i, 				AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'monthly', 		 /текущий ежемесячный расход[^>]*>([^<]*)/i, 		AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'daily', 	         /текущий ежедневный расход[^>]*>([^<]*)/i,         AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'monthly_income',  /ежемесячный реферальный[^>]*доход[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	
    AnyBalance.setResult(result);
}
