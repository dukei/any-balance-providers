/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Encoding': 'gzip, deflate, br',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Referer': 'https://www.netprint.ru/',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function generateUUID() {
	function s4() {
  		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
  	return s4() + s4() + s4() + s4() + s4() + s4() + s4() + s4();
}

var baseurl = 'https://www.netprint.ru/';
var g_savedData;
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	if(!g_savedData)
		g_savedData = new SavedData('netprint', prefs.login);

	g_savedData.restoreCookies();
	
	html = AnyBalance.requestGet(baseurl + 'order/profile', g_headers);
	
	if(!/Необходима авторизация/i.test(html)){
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}else{
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');

	    AnyBalance.setCookie('.netprint.ru', 'usergid', '' + generateUUID());
	
		var form = AB.getElement(html, /<form[^>]+class="form"[^>]*>/i);
		if(!form){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удаётся найти форму входа! Сайт изменен?');
		}
	        
		var params = AB.createFormParams(form, function(params, str, name, value) {
			if (name == 'POST_AUTH_USER') {
				return prefs.login;
			} else if (name == 'POST_AUTH_PASSWD') {
				return prefs.password;
			} else if (name == 'is_ajax') {
				return 1;
			}
	        
			return value;
		});
			
		var action = getParam(form, null, null, /<form[\s\S]*?action=\"([\s\S]*?)\"/i, replaceHtmlEntities);
			
		html = AnyBalance.requestPost(joinUrl(baseurl, action), params, addHeaders({
			'Accept': 'application/json, text/javascript, */*; q=0.01',
        	'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        	'Referer': baseurl + 'order/profile',
        	'X-Requested-With': 'XMLHttpRequest'
		}), g_headers);

	    var json = getJson(html);
	    AnyBalance.trace(JSON.stringify(json));
	    if (json.code != 100) {
	    	var error = json.error;
	    	if (error)
	    		throw new AnyBalance.Error(error, null, /password/i.test(error));
	    	AnyBalance.trace(html);
	    	throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	    }
	
	    g_savedData.setCookies();
	    g_savedData.save();
    }
	
	var result = {success: true};
	
	html = AnyBalance.requestGet(baseurl + 'order/profile', g_headers);
	
	getParam(html, result, 'balance', /Мои финансы[\s\S]*?balance[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonuses', /Бонусы и скидки[\s\S]*?balance[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	
	html = AnyBalance.requestGet(baseurl + 'order/user-settings/', g_headers);
	
	var firstName = getParam(html, null, null, /name="user_firstname" value="([^"]*)/i, replaceTagsAndSpaces);
	var lastName = getParam(html, null, null, /name="user_lastname" value="([^"]*)/i, replaceTagsAndSpaces);
	var fio = firstName;
	if (lastName)
		fio += ' ' + lastName;
	getParam(fio, result, 'fio', null, replaceTagsAndSpaces);
	getParam(fio, result, '__tariff', null, replaceTagsAndSpaces);
    getParam(html, result, 'login', /name="user_login" value="([^"]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'email', /name="user_email" value="([^"]*)/i, replaceTagsAndSpaces);
	getParam(html, result, 'phone', /name="user_phone" value="([^"]*)/i, null, replaceNumber);
	
	html = AnyBalance.requestGet(baseurl + 'order/profile-order-history/', g_headers);
	
	var hist = getJsonObject(html, /new\s*OrderHistory\(/);

	if(hist){
		getParam(hist.orders[0].date, result, 'lastorderdate');
		getParam(hist.orders[0].order_id, result, 'lastordernum');
		getParam(hist.orders[0].price, result, 'lastordersum', null, parseBalance);
		getParam(hist.orders[0].status, result, 'lastorderstatus');
	}else{
		AnyBalance.trace('Последний заказ не найден');
	}
	
	AnyBalance.setResult(result);
}
