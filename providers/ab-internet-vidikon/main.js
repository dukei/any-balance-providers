/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'Origin': 'https://cabinet.vidikon.tv',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
};

var baseurl = 'https://cabinet.vidikon.tv/';
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() >= 400)
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	
	var form = getElement(html, /<form[^>]*>/i);
    if(!form){
        AnyBalance.trace(form);
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
    }
	
	var params = createFormParams(form, function(params, str, name, value) {
	   	if(name == 'LoginForm[login]') {
	   		return prefs.login;
    	}else if(name == 'LoginForm[password]'){
	    	return prefs.password;
	    }
        	        
	    return value;
	});
		
	var action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
		
	html = AnyBalance.requestPost(joinUrl(baseurl, action), params, addHeaders({
		'Content-Type': 'application/x-www-form-urlencoded',
	    'Referer': AnyBalance.getLastUrl(),
	}));
	
	if(!/logout/i.test(html)){
		var error = getParam(html, /<div[^>]+class="alert alert-block alert-error "[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		if(error)
			throw new AnyBalance.Error(error, null, /пользовател|логин|парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /<span[^>]+class="balance-home"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'agreement', /<div[^>]+class="agreement__info"[^>]*>[\s\S]*?"selected"[^>]*>([\s\S]*?)<\/option>/i, replaceTagsAndSpaces);
	getParam(html, result, 'email', /<div[^>]+class="email-person person"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'phone', /<div[^>]+class="phone-person person"[^>]*>([\s\S]*?)<\/div>/i, replaceNumber);
	getParam(html, result, 'fio', /<div[^>]+class="name-person person"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	
	var url = getParam(html, null, null, /<a[^>]+class="show-vgroups"[^>]+url="([^"]*)/i, replaceHtmlEntities);
	var csrf = getParam(html, null, null, /<a[^>]+class="show-vgroups"[^>]+crf="([^"]*)/i, replaceHtmlEntities);
	var agrmId = getParam(html, null, null, /<a[^>]+class="show-vgroups"[^>]+id="([^"]*)/i, [replaceHtmlEntities, /\D/g, '']);
	
	html = AnyBalance.requestPost(joinUrl(baseurl, url), {'agrmid': agrmId, 'YII_CSRF_TOKEN': csrf}, addHeaders({
		'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
	    'Referer': AnyBalance.getLastUrl(),
		'X-Requested-With': 'XMLHttpRequest'
	}));
	
	var json = getJson(html);
	
	AnyBalance.trace('Accounts: ' + JSON.stringify(json));
	
	if(json.body && json.body.length > 0){
		var acc = json.body[0];
		getParam(acc.tarifdescr, result, '__tariff', /<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		getParam(acc.tarifdescr, result, ['tariff_speed', 'speedunit'], /<div[^>]+class="tar-curshape"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(acc.tarifdescr, result, ['speedunit', 'tariff_speed'], /<div[^>]+class="tar-curshape"[^>]*>([\s\S]*?)<\/div>/i, [replaceTagsAndSpaces, /\d+|\s*/g, '']);
		getParam(acc.rent, result, 'tariff_abon', null, null, parseBalance);
		getParam(acc.login.login, result, 'account', null, null);
		getParam(acc.state.state, result, 'account_status', null, null);
		if(acc.services && acc.services.length > 0){
		    getParam(acc.services[acc.services.length - 1], result, 'services', null, null);
		}else{
			result.services = 'Нет подключенных услуг';
		}
	}else{
		AnyBalance.trace('Не удалось получить данные по учетным записям');
	}
	
	
	if(AnyBalance.isAvailable('month_payments', 'month_expenses')){
	    html = AnyBalance.requestGet(baseurl + 'api.php?r=invoice/info', addHeaders({'Referer': baseurl + 'api.php?r=invoice/index'}));
		
		getParam(html, result, 'month_payments', /платежи в текущем месяце[\s\S]*?panel-form-item-value[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'month_expenses', /расход[ы]? в текущем месяце[\s\S]*?panel-form-item-value[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	}
	
	if(AnyBalance.isAvailable('last_payment_date', 'last_payment_number', 'last_payment_agreement', 'last_payment_state', 'last_payment_type', 'last_payment_sum')){
	    html = AnyBalance.requestGet(baseurl + 'api.php?r=payment/history', addHeaders({'Referer': baseurl + 'api.php?r=invoice/index'}));
		
		var table = getElement(html, /<table[^>]+panel-grid-statistics[^>]*>/i);
		var tbody = getElement(table, /<tbody[^>]*>/i);
	    var payments = getElements(tbody, /<tr[^>]+class[^>]*>/ig);
	
	    if(payments.length && payments.length > 0){
			AnyBalance.trace('Найдено платежей: ' + payments.length);
		    for(var i=0; i<payments.length; ++i){
	    	    var payment = payments[i];
				
				getParam(payment, result, 'last_payment_date', /<td[^>]+label="Дата"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDateWord);
		        getParam(payment, result, 'last_payment_number', /<td[^>]+label="Номер платежа"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
				getParam(payment, result, 'last_payment_agreement', /<td[^>]+label="Договор"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
				getParam(payment, result, 'last_payment_state', /<td[^>]+label="Состояние"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, capitalizeFirstLetter);
				getParam(payment, result, 'last_payment_type', /<td[^>]+label="Способ платежа"[^>]*>([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, /^-\s+/i, ''], capitalizeFirstLetter);
				getParam(payment, result, 'last_payment_sum', /<td[^>]+label="Сумма"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
				
			    break;
	        }
		}else{
			AnyBalance.trace('Не удалось получить данные по платежам');
		}
	}
	
	AnyBalance.setResult(result);
}

function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
