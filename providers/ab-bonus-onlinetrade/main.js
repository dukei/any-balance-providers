/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Linux; Android 8.0.0; AUM-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36',
};

var baseurl = 'https://m.onlinetrade.ru/';
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
		clearAllCookiesExceptProtection();
		
		var html = AnyBalance.requestGet(baseurl, addHeaders({"Referer": "android-app://ru.onlinetrade.app/"}));
		
		html = AnyBalance.requestGet(baseurl + 'member/login.html', g_headers);
		
		if(!html || AnyBalance.getLastStatusCode() > 400){
	    	AnyBalance.trace(html);
	    	throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
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
			
	    var table = getElement(html, /<div[^>]+id="tableONBonus__ID[^>]*>/i);
	    var item = getElements(table, /<div[^>]+class="editableList__item[^>]*>/ig)[0];
		
		if (item) {
			getParam(item, result, 'last_oper_sum', /<span[^>]+class="(?:green|red)">[\s\S]*?<\/span>([\s\S]*?)<span/i, replaceTagsAndSpaces, parseBalance);
		    getParam(item, result, 'last_oper_date', /<div[^>]*>(?:[\s\S]*?<span[^>]*>){1}([\s\S]*?)<\/span/i, replaceTagsAndSpaces, parseDate);
			getParam(item, result, 'last_oper_name', /<div[^>]*>(?:[\s\S]*?<a[^>]*>){1}([\s\S]*?)<\/a/i, replaceTagsAndSpaces);
		    getParam(item, result, 'last_oper_type', /<span[^>]+class="(?:green|red)">([\s\S]*?)[.,:;-]*?<\/span/i, replaceTagsAndSpaces, capitalFirstLetters);
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

function clearAllCookiesExceptProtection(){
	clearAllCookies(function(c){return!/spid|spsc/i.test(c.name)})
}