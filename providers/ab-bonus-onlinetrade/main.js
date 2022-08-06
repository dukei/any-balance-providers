/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.125 Safari/537.36',
};

var baseurl = 'https://www.onlinetrade.ru/';
var g_savedData;
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('windows-1251');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	if(!g_savedData)
		g_savedData = new SavedData('onlinetrade', prefs.login);

	g_savedData.restoreCookies();
	
	html = AnyBalance.requestGet(baseurl + 'member/', g_headers);
	
	if (!/\?log_out=1/i.test(html)) {
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
	
	    var html = AnyBalance.requestGet(baseurl + 'member/login.html', g_headers);
		
		if(!html || AnyBalance.getLastStatusCode() > 400){
	    	AnyBalance.trace(html);
	    	throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	    }
		
	    var cE = getParam(html, /var\s+cE\s*=\s*['"]([^"']*)/);
	    if(cE){
	    	AnyBalance.trace('Fooling stormwall');
	    	var cK = getParam(html, /var\s+cK\s*=\s*(\d+)/, null, parseBalance);
	    	var cookie = generateCookieValue(cK, cE);
	    	AnyBalance.trace('swp_token: ' + cookie);
	    	AnyBalance.setCookie('www.onlinetrade.ru', 'swp_token', cookie);
			html = AnyBalance.requestGet(baseurl + 'member/login.html', g_headers);
	    }

	    var form = getElements(html, [/<form/ig, /password/i])[0];
	    
	    if(!form){
	    	AnyBalance.trace(html);
	    	throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	    }

	    var params = createFormParams(form, function(params, str, name, value) {
	    	if (name == 'login') {
	    		return prefs.login;
	    	} else if (name == 'password') {
	    		return prefs.password;
	    	} else if (name == 'captcha') {
	    		var img = AnyBalance.requestGet(baseurl + 'captcha.php?mode=login', addHeaders({Referer: baseurl + 'member/login.html'}));
	    		return AnyBalance.retrieveCode('Пожалуйста, введите цифры с картинки', img, { inputType: 'number' });
	    	}

	    	return value;
	    });
	
	    html = AnyBalance.requestPost(baseurl + 'member/login.html', params, addHeaders({Referer: baseurl + 'member/login.html'}));
	
	    if (!/\?log_out=1/i.test(html)) {
	    	var error = getElement(html, /<[^>]+coloredMessage__red/i, replaceTagsAndSpaces);
	    	if (error)
	    		throw new AnyBalance.Error(error, null, /логин|парол/i.test(error));
		
	    	AnyBalance.trace(html);
	    	throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	    }
	
	    g_savedData.setCookies();
	    g_savedData.save();
    
	}else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /ON-бонусов:<\/span[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonuses', /ON-бонусов:([^>]+)"><span/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'messages', /Сообщения:[\s\S]*?<div[^>]*>([\s\S]*?)(?:<a|<\/div)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bookmarks', /Мои закладки[\s\S]*?bookmarksCount[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'basket', /Ваша корзина[\s\S]*?itemCount[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'userId', /Клиентский номер[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /Статус:[\s\S]*?<span[^>]*>([\s\S]*?)(?:<a|<\/span)/i, replaceTagsAndSpaces);
	getParam(html, result, 'status', /Статус:[\s\S]*?<span[^>]*>([\s\S]*?)(?:<a|<\/span)/i, replaceTagsAndSpaces);
	var point = getParam(html, null, null, /Мой пункт выдачи:[\s\S]*?<div[^>]*>([\s\S]*?)(?:<a|<\/div)/i, replaceTagsAndSpaces);
	if (point && point !== ''){
		getParam(point, result, 'point');
    }else{
		getParam('Не выбран', result, 'point');
	}
	
	if (AnyBalance.isAvailable('last_oper_sum', 'last_oper_date', 'last_oper_name', 'last_oper_type')) {
 		html = AnyBalance.requestGet(baseurl + 'member/bonuses.html', g_headers);
			
	    var table = getElement(html, /<table[^>]+id="tableONBonus__ID[^>]*>/i);
		if (table) {
			var tbody = getElement(table, /<tbody[^>]*>/i);
			var hist = getElements(tbody, /<tr[^>]*>/ig)[0];
	    }
		
		if (hist) {
			getParam(hist, result, 'last_oper_sum', /<td>(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		    getParam(hist, result, 'last_oper_date', /<td>(?:[\s\S]*?<span[^>]*>){1}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDate);
			getParam(hist, result, 'last_oper_name', /<td>(?:[\s\S]*?<a[^>]*>){1}([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, capitalFirstLetters);
		    getParam(hist, result, 'last_oper_type', /<td>(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, capitalFirstLetters);
		} else {
			AnyBalance.trace('Не удалось получить данные по последней операции');
		}
	}
	
	if (AnyBalance.isAvailable('email', 'phone', 'fio')) {
	    html = AnyBalance.requestGet(baseurl + 'member/edit.html', g_headers);
    
        getParam(html, result, 'email', /E-mail[\s\S]*?name="email"\s?value="([^"]*)/i, replaceTagsAndSpaces);
        getParam(html, result, 'phone', /Мобильный телефон[\s\S]*?name="cellphone"\s?value="([^"]*)/i, replaceNumber);
	    getParam(html, result, 'fio', /Контактное лицо[\s\S]*?name="contact"\s?value="([^"]*)/i, replaceTagsAndSpaces);
	}
	
	AnyBalance.setResult(result);
}