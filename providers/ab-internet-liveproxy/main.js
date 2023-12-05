/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://liveproxy.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() >= 400)
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	
	var form = getElement(html, /<form[^>]+login-form[^>]*>/i);
    if(!form){
        AnyBalance.trace(form);
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
    }
	
	var params = createFormParams(form, function(params, str, name, value) {
	   	if(name == 'LoginForm[username]') {
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
		var error = getParam(html, /<div[^>]+has-error[\s\S]*?<p[^>]+help-block-error[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
		if(error)
			throw new AnyBalance.Error(error, null, /логин|парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /<td[^>]*>Баланс[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credit', /<td[^>]*>Кредит[\s\S]*?<td[^>]*>([\s\S]*?)<(?:[\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /<td[^>]*>Тариф[\s\S]*?<td[^>]*>([\s\S]*?)<(?:[\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'lic_schet', /<td[^>]*>ID \/ Лицевой сч[её]т[\s\S]*?<td[^>]*>([\s\S]*?)<(?:[\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'status', /<td[^>]*>Статус[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'tarif_desc', /<td[^>]*>Тариф[\s\S]*?<td[^>]*>(?:[\s\S]*?)(<[\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, /руб\.?/i, '₽']);
	getParam(html, result, 'ip', /<td[^>]*>IP[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'apikey', /<td[^>]*>API ключ[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'address', /<td[^>]*>Адрес[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'email', /<td[^>]*>Email[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'fio', /<td[^>]*>ФИО[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	
	if(AnyBalance.isAvailable('last_pay_date', 'last_pay_sum', 'last_pay_type')){
	    html = AnyBalance.requestGet(baseurl + 'lk/payments', addHeaders({'Referer': baseurl + 'lk'}));
		
		var table = getElement(html, /<table[^>]+table[^>]*>/i);
	    var pays = getElements(table, /<tr[^>]*><td[^>]*>/ig);
	
	    if(pays.length && pays.length > 0){
			AnyBalance.trace('Найдено платежей: ' + pays.length);
		    for(var i=0; i<pays.length; ++i){
	    	    var pay = pays[i];
				
				getParam(pay, result, 'last_pay_date', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
		        getParam(pay, result, 'last_pay_sum', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
				getParam(pay, result, 'last_pay_type', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
				
			    break;
	        }
		}else{
			AnyBalance.trace('Не удалось получить данные по платежам');
		}
	}
	
	if(AnyBalance.isAvailable('last_oper_date', 'last_oper_sum_before', 'last_oper_sum', 'last_oper_sum_after')){
	    html = AnyBalance.requestGet(baseurl + 'lk/specification', addHeaders({'Referer': baseurl + 'lk'}));
		
		var table = getElement(html, /<table[^>]+table[^>]*>/i);
	    var hists = getElements(table, /<tr[^>]*><td[^>]*>/ig);
	
	    if(hists.length && hists.length > 0){
			AnyBalance.trace('Найдено операций: ' + hists.length);
		    for(var i=0; i<hists.length; ++i){
	    	    var hist = hists[i];
				
				getParam(hist, result, 'last_oper_date', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDateISO);
		        getParam(hist, result, 'last_oper_sum_before', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
				getParam(hist, result, 'last_oper_sum', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
				getParam(hist, result, 'last_oper_sum_after', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
				
			    break;
	        }
		}else{
			AnyBalance.trace('Не удалось получить данные по операциям');
		}
	}
    	
	AnyBalance.setResult(result);
}
