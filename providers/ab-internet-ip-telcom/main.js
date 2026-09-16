/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.7,en;q=0.4',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36'
};

var baseurl = 'https://cabinet.iptel.by';
var g_savedData;
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+$1 ($2) $3-$4-$5'];

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	if(!g_savedData)
		g_savedData = new SavedData('iptelcom', prefs.login);

	g_savedData.restoreCookies();

    var html = AnyBalance.requestGet(baseurl + '/?page=home', g_headers);

    if(AnyBalance.getLastStatusCode() >= 500){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
	if(!/logout/i.test(html)){
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
	
	    var html = AnyBalance.requestGet(baseurl + '/', g_headers);
	
	    var form = getElement(html, /<form[^>]+form-login[^>]*>/i);
        if(!form){
	    	AnyBalance.trace(html);
	    	throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
        }
	
	    var params = createFormParams(form, function(params, str, name, value) {

	    	if(name === 'login'){
	    		value = prefs.login;
	    	}else if(name === 'password'){
	    		value = prefs.password;
	    	}
		
	    	return value;
        });

        var action = getParam(form, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
		if(!action){
	    	action = '/';
        }

	    html = AnyBalance.requestPost(joinUrl(baseurl, action), params, addHeaders({
	    	'Content-Type': 'application/x-www-form-urlencoded', 
	    	'Origin': baseurl, 
	    	'Referer': baseurl + '/'
	    }));
	
	    if (!/logout/i.test(html)) {
	    	var error = getElement(html, /<div[^>]+alert-error/i, replaceTagsAndSpaces);
	    	if (error)
	    		throw new AnyBalance.Error(error, null, /логин|парол/i.test(error));
		
	    	AnyBalance.trace(html);
	    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	    }
		
		g_savedData.setCookies();
	    g_savedData.save();
		
	}else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Баланс[\s\S]*?<span[^>]+class="money"[^>]*>([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'credit', /Кредит[\s\S]*?<span[^>]+class="money"[^>]*>([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /<div[^>]+class="profile-hero-status is-active"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'type', /<span[^>]+class="profile-hero-person-type"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /Текущий тариф[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces);
	getParam(html, result, 'abon', /Абон[\s\S]*? плата[\s\S]*?<span[^>]+class="money"[^>]*>([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'discount', /Списано[\s\S]*?<span[^>]+class="money"[^>]*>([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'date_start', /Расч[её]тный период[\s\S]*?<dd[^>]*>([\s\S]*?)\s*?—\s*?[\s\S]*?<\/dd>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'date_till', /Расч[её]тный период[\s\S]*?<dd[^>]*>[\s\S]*?\s*?—\s*?([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'date_connect', /<div[^>]+class="profile-meta-connected"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'licschet', /<span[^>]+class="profile-account-value"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'fio', /<h1[^>]+class="profile-name"[^>]*>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces);
	
	var periodStartDate = getParam(html, null, null, /Расч[её]тный период[\s\S]*?<dd[^>]*>([\s\S]*?)\s*?—\s*?[\s\S]*?<\/dd>/i, [replaceTagsAndSpaces, /^(\d{2})\.(\d{2})\.(\d{4})$/, '$3-$2-$1']);
	var periodEndDate = getParam(html, null, null, /Расч[её]тный период[\s\S]*?<dd[^>]*>[\s\S]*?\s*?—\s*?([\s\S]*?)<\/dd>/i, [replaceTagsAndSpaces, /^(\d{2})\.(\d{2})\.(\d{4})$/, '$3-$2-$1']);
	
	if(AnyBalance.isAvailable(['traffic_volume', 'traffic_discount'])){
		var startDate, endDate, dt = new Date();
		if((periodStartDate && /^(\d{4})-(\d{2})-(\d{2})$/i.test(periodStartDate)) && (periodEndDate && /^(\d{4})-(\d{2})-(\d{2})$/i.test(periodEndDate))){
			startDate = periodStartDate;
			endDate = periodEndDate;
		}else{ // Если период получить не удалось, пробуем сформировать отчет за текущий месяц
			startDate = dt.getFullYear() + '-' + n2(dt.getMonth()+1) + '-' + '01';
            endDate = dt.getFullYear() + '-' + n2(dt.getMonth()+1) + '-' + n2(dt.getDate());
		}
		
		html = AnyBalance.requestGet(baseurl + '/?page=reports&report=traffic&ttype=general&from='+ startDate + '&to=' + endDate + '&period=custom', addHeaders({'Referer': baseurl + '/?page=reports'}));
		
		var details = getElement(html, /<details[^>]+id="traffic"[^>]*>/i);
		var tab = getElement(details, /<table[^>]*>/i);
        
		getParam(tab, result, 'traffic_volume', /ИТОГО[\s\S]*?<td[^>]+class="col-num"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(tab, result, 'traffic_discount', /ИТОГО[\s\S]*?<span[^>]+class="money"[^>]*>([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
    }
	
	if(AnyBalance.isAvailable(['last_payment_sum', 'last_payment_date', 'last_payment_type'])){
		var dt = new Date();
        var dtPrev = new Date(dt.getFullYear(), dt.getMonth()-3, dt.getDate());
        var dts = dt.getFullYear() + '-' + n2(dt.getMonth()+1) + '-' + n2(dt.getDate());
        var dtPrevs = dtPrev.getFullYear() + '-' + n2(dtPrev.getMonth()+1) + '-' + n2(dtPrev.getDate());
		
		html = AnyBalance.requestGet(baseurl + '/?page=reports&report=payments&from='+ dtPrevs + '&to=' + dts + '&period=custom', addHeaders({'Referer': baseurl + '/?page=reports'}));
		
		var details = getElement(html, /<details[^>]+id="payments"[^>]*>/i);
		var tab = getElement(details, /<table[^>]+class[\s\S]*?<tbody>/i);
		var pays = getElements(tab, [/<tr[^>]*>/ig, /\d\d.\d\d.\d\d\d\d/i]);
   	   	if(pays && pays.length && pays.length > 0){
			// Данные по последнему платежу
			AnyBalance.trace('Найдено платежей: ' + pays.length);
			var pay = pays[0];
            getParam(pay, result, 'last_payment_sum', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		    getParam(pay, result, 'last_payment_date', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
            getParam(pay, result, 'last_payment_type', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		}else{
            AnyBalance.trace('Последний платеж не найден');
        }
    }
	
	if(AnyBalance.isAvailable(['address', 'phone'])){
        html = AnyBalance.requestGet(baseurl + '/?page=profile', addHeaders({'Referer': baseurl + '/'}));
		
	    getParam(html, result, 'address', /Адрес[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces);
	    getParam(html, result, 'phone', /Мобильный телефон[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceNumber);		
    }

	AnyBalance.setResult(result);
}
