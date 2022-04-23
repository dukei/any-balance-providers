/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
};

var baseurl = 'https://lk.novogor.perm.ru';
var g_savedData;

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login1, 'Введите логин!');
	checkEmpty(prefs.password1, 'Введите пароль!');
	
	if(!g_savedData)
		g_savedData = new SavedData('novogor', prefs.login);

	g_savedData.restoreCookies();

	var html = AnyBalance.requestGet(baseurl + '/account', g_headers);
	AnyBalance.trace('Status?');
	var s = AnyBalance.getLastStatusCode();
	AnyBalance.trace('Status: ' + s);
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	if(/logout/i.test(html)){
		AnyBalance.trace('Сессия сохранена. Входим автоматически.');
	}else{
		AnyBalance.trace('Сессия новая. Будем логиниться заново.');
		clearAllCookies();
	
        var form = getElement(html, /<form[^>]+class="form ajax-form"[^>]*>/i);
	    if(!form){
	    	AnyBalance.trace(html);
	    	throw new AnyBalance.Error('Не удалось найти форму входа! Сайт изменен?');
	    }

	    var key = getParam(form, /data-sitekey="?([^"]*)/i, replaceHtmlEntities);
	    var captcha;
	    if(key)
	    	captcha = solveRecaptcha("Пожалуйста, докажите, что вы не робот", AnyBalance.getLastUrl(), key);

	    var params = createFormParams(form, function(params, str, name, value) {
	    	if (name == 'login')
	    		return prefs.login1;
	    	else if (name == 'password')
	    		return prefs.password1;

	    	return value;
	    });
	
	    params['g-recaptcha-response'] = captcha;

	    html = AnyBalance.requestPost(baseurl + '/login', params, addHeaders({Referer: baseurl + '/login'}));

	    if (!/logout/i.test(html)) {
	    	var error = getParam(html, null, null, /<p[^>]+class="error-text">([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
	    	if (error)
	    		throw new AnyBalance.Error(error, null, /пользовател|парол/i.test(error));

	    	AnyBalance.trace(html);
	    	throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	    }
		
		g_savedData.setCookies();
	    g_savedData.save();
	}

	// Получим список лицевых счетов
	var rows = getElements(html, /<div[^>]+class="account-info"[^>]*>/ig);

	if (rows.length < 1) {
        throw new AnyBalance.Error('У вас нет ни одного лицевого счета!');
	}

	var html = prefs.id > 0 && prefs.id <= rows.length ? rows[prefs.id - 1] : rows[0];

	var result = {success: true, __tariff: 'Водоснабжение и водоотведение'};

	getParam(html, result, 'balance', /account-info__value">([^&\s]*)/i, replaceTagsAndSpaces, parseBalance);
	if(AnyBalance.isAvailable('balance') && !result.balance) {
		result.balance = 0;
	}
	else {
		[,balance_str] = html.match(/<div class="account-info__text">(.*) на/);
		AnyBalance.trace(balance_str);
		if (balance_str == 'К оплате') {
			result.balance = -result.balance;
		}
	}
	getParam(html, result, 'account', /Лицевой счет №([^<&\s]*)/i);
	getParam(html, result, 'fio', /account-info__title">(?:[\s\S]*?)([\s\S]*?)Лицевой счет/i);
	getParam(html, result, 'adress', /<div>(?:[\s\S]*?)([\s\S]*?)<\/div>/i);

	AnyBalance.setResult(result);
}
