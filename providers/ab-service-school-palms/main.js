/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36'
};

var g_baseurl = 'https://pitanie.uecard.ru/';
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];
var g_savedData;

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
    checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите номер телефона (10 цифр без пробелов и разделителей)!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	if(!g_savedData)
		g_savedData = new SavedData('palms', prefs.login);

	g_savedData.restoreCookies();
	
	var html = AnyBalance.requestGet(g_baseurl + 'cabinet/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}
	
	if(!/logout/i.test(html)){
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
        clearAllCookies();
	
	    var html = AnyBalance.requestGet(g_baseurl + 'cabinet/', g_headers);
	
	    html = AnyBalance.requestGet(g_baseurl + 'user/login/', g_headers);
		
		var form = getElement(html, /<form[^>]+login[^>]*>/i);
        if(!form){
        	AnyBalance.trace(form);
        	throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
        }
	
	    var params = createFormParams(form, function(params, str, name, value) {
	   		if(name == 'login') {
	   			return '8' + prefs.login;
    		}else if(name == 'pwd'){
	    		return prefs.password;
	    	}
	        
	    	return value;
	    });
		
		html = AnyBalance.requestPost(g_baseurl + 'user/login/', params, addHeaders({'Content-Type': 'application/x-www-form-urlencoded', 'Referer': AnyBalance.getLastUrl()}));
		
		if(!/logout/.test(html)){
		    var error = getElement(html, /<div[^>]+alert[^>]*>/i, replaceTagsAndSpaces);
		    if(error)
			    throw new AnyBalance.Error(error, null, /логин|парол/i.test(error));

		    AnyBalance.trace(html);
		    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	    }
		
		html = AnyBalance.requestGet(g_baseurl + 'cabinet/', g_headers);
		
		g_savedData.setCookies();
	    g_savedData.save();
	}else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}
	
    var result = {success: true};
    
	var dt = new Date();
	
	var monthes = {0: 'Январь', 1: 'Февраль', 2: 'Март', 3: 'Апрель', 4: 'Май', 5: 'Июнь', 6: 'Июль', 7: 'Август', 8: 'Сентябрь', 9: 'Октябрь', 10: 'Ноябрь', 11: 'Декабрь'}
	getParam(monthes[dt.getMonth()] + ' ' + dt.getFullYear(), result, 'period');
	
	getParam(html, result, 'balance', /Основной счет:[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'blocked', /Заблокировано:[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /<div[^>]+class="kk1-container-child-card-flex-name"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'account', /<div[^>]+class="kk1-container-child-card-flex-name"[^>]*>(?:[\s\S]*?<label[^>]*>){2}([\s\S]*?)<\/label>/i, replaceTagsAndSpaces);
	getParam(html, result, 'account_desc', /<div[^>]+class="kk1-container-child-card-flex-name"[^>]*>(?:[\s\S]*?<label[^>]*>){1}([\s\S]*?)<\/label>/i, replaceTagsAndSpaces);
	getParam(html, result, 'account_school', /<div[^>]+class="kk1-container-child-card-content-address"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'fio', /<a[^>]+class="kk1-a-link kk1-black" href="\/user\/profile"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);
	
	if(AnyBalance.isAvailable('last_oper_date', 'last_oper_sum', 'last_oper_type')) {
	    var hist = getElement(html, /<form[^>]+id="transactions-form"[^>]*>/i);
	    
	    var items = getElements(hist, /<div[^>]+class="history__item[^>]*>/ig);
	    
	    if(items && items.length > 0){
			AnyBalance.trace('Найдено операций: ' + items.length);
	        for(var i=0; i<items.length; ++i){
	        	var item = items[i];
				getParam(item, result, 'last_oper_date', /<div[^>]+class="history__date[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDateWord);
				getParam(item, result, 'last_oper_sum', /<div[^>]+class="history__amount[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
				getParam(item, result, 'last_oper_type', /<div[^>]+class="history__text[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
				
				break;
			}
	    }else{
	    	AnyBalance.trace('Не удалось получить историю операций');
	    }
	}
	
	if(AnyBalance.isAvailable('last_order_desc', 'last_order_date', 'last_order_sum', 'last_order_type')) {	
		var groups = getElement(html, /<ul[^>]+class="list-group[^>]*>/i);
		
		var items = getElements(groups, /<li[^>]+class="list-group-item[^>]*>/ig);
	    
	    if(items && items.length > 0){
			AnyBalance.trace('Найдено заказов: ' + items.length);
	        for(var i=0; i<items.length; ++i){
	        	var item = items[i];
				getParam(item, result, 'last_order_desc', /(?:[\s\S]*?<div[^>]*>){1}[\s\S]*?<\/b>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
				getParam(item, result, 'last_order_date', /(?:[\s\S]*?<div[^>]*>){1}([\s\S]*?)(?:<\/b>|Заказ)/i, replaceTagsAndSpaces, parseDate);
				getParam(item, result, 'last_order_sum', /(?:[\s\S]*?<div[^>]*>){3}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
				getParam(item, result, 'last_order_type', /(?:[\s\S]*?<div[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
				
				break;
			}
	    }else{
	    	AnyBalance.trace('Не удалось получить список заказов');
	    }
	}
	
	getParam(html, result, 'total_refill', /Всего пополнено:[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'total_expenses', /Всего потрачено:[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    
	AnyBalance.setResult(result);
}
