/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 	'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 	'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 		'keep-alive',
	'User-Agent': 		'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36',
};

var baseurl = 'https://www.litres.ru/';
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function main() {
	var prefs = AnyBalance.getPreferences();
    
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'pages/login/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var csrf = getParam(html, null, null, /name="csrf"\s?value="([^"]*)/i, replaceTagsAndSpaces);
	
	html = AnyBalance.requestPost(baseurl + 'pages/ajax_empty2/', {
		'pre_action': 'login',
		'ref_url': '/',
		'login': prefs.login,
		'pwd': prefs.password,
		'showpwd': 'on',
		'utc_offset_min': '180',
		'timestamp': new Date().getTime(),
		'csrf': csrf,
		'gu_ajax': true
	}, addHeaders({
		Referer: baseurl + 'pages/login/'
	}));
	
	if (/error/i.test(html)) {
		var error = getParam(html, null, null, /"error_msg"\s?:\s?"([^"]*)/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /логин|парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	html = AnyBalance.requestGet(baseurl, g_headers);
	
	getParam(html, result, 'balance', /setUserBalance\({[\s\S]*?account:([\s\S]*?),/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonus', /setUserBalance\({[\s\S]*?bonus:([\s\S]*?),/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /setUserCredentials\({[\s\S]*?name:\s?"([^"]*)/i, replaceTagsAndSpaces);
	var regDate = getParam(html, null, null, /setUserCredentials\({[\s\S]*?dateRegister:\s?"([^"]*)/i, replaceTagsAndSpaces);
	getParam(regDate.replace(/(\d\d\d\d)-(\d\d)-(\d\d)(.*)/, '$3.$2.$1'), result, 'regdate', null, null, parseDate);
	var fio = getParam(html, null, null, /setUserCredentials\({[\s\S]*?firstName:\s?"([^"]*)/i, replaceTagsAndSpaces);
	var lastName = getParam(html, null, null, /setUserCredentials\({[\s\S]*?lastName:\s?"([^"]*)/i, replaceTagsAndSpaces); 
	if (lastName)
		fio += ' ' + lastName;
	getParam(fio, result, 'fio');
	getParam(html, result, 'phone', /setUserCredentials\({[\s\S]*?phoneNumber:\s?"([^"]*)/i, replaceNumber);

	if(AnyBalance.isAvailable('books', 'deferred', 'basket')){
		html = AnyBalance.requestGet(baseurl + 'pages/my_books_all/', g_headers);
		getParam(html, result, 'books', /Мои[\s\S]*?"my-books-link__counter"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'deferred', /Отложенные[\s\S]*?"my-books-link__counter"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
		var basket = getParam(html, null, null, /Корзина[\s\S]*?"my-books-link__counter"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalanceSilent);	
		getParam(0|basket, result, 'basket', null, null, parseBalance);
	}
	
	if (AnyBalance.isAvailable('lastoperdate', 'lastopersum', 'lastoperdesc')) {
		html = AnyBalance.requestGet(baseurl + 'pages/personal_cabinet_history_log/', g_headers);
	    var opers = getElements(html, /<div[^>]+class="history-event"[^>]*>/ig);
	    if(opers){
	    	AnyBalance.trace('Найдено операций: ' + opers.length);
			
	        for(var i = 0; i<opers.length; i++){
	    		var oper = opers[0]
	        	getParam(opers[i], result, 'lastoperdate', /<p[^>]+class="event-date">([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseDate);
	    		var sum = getParam(opers[i], null, null, /<p[^>]+class="payment-amount">([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalanceSilent);
				getParam(0|sum, result, 'lastopersum', null, null, parseBalance);
	    		getParam(opers[i], result, 'lastoperdesc', /<p[^>]+class="event-title">([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
	        }
	    }else{
 	    	AnyBalance.trace('Не удалось получить данные по операциям');
	    }
    }	
	
	AnyBalance.setResult(result);
}