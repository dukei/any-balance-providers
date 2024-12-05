/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://lk.globalalania.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	prefs.login = prefs.login.toUpperCase();
//	if(!/IR-/i.test(prefs.login))
//		prefs.login = 'IR-' + prefs.login.replace(/\D/g,'');
	
	var html = AnyBalance.requestGet(baseurl + 'login/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400 || /Server Error \(\d+\)/i.test(html)){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}
	
	var form = getElement(html, /<form[^>]+id="form-auth"[^>]*>/i);
	if(!form){
	    AnyBalance.trace(html);
	    throw new AnyBalance.Error('Не удалось найти форму входа! Сайт изменен?');
	}
    
	var params = createFormParams(form, function(params, str, name, value) {
	    if (name == 'login')
	    	return prefs.login;
	    else if (name == 'pswd')
	    	return prefs.password;
    
	    	return value;
	});
    
	html = AnyBalance.requestPost(baseurl + 'login/', params, addHeaders({Referer: baseurl + 'login/'}));
    
	if (!/logout/i.test(html)) {
	    var error = getParam(html, null, null, /<div[^>]+role="alert"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	    if (error)
	    	throw new AnyBalance.Error(error, null, /договор|парол/i.test(error));
        
	    AnyBalance.trace(html);
	    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Мой баланс[\s\S]*?<p[^>]+class="card-balance[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /<span[^>]+class="profile-block-content-info-title">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'account', /<div[^>]+class="user-info-fio">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fee', /<div[^>]+class="profile-block-content-data-service month">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	
	var servBlock = getElements(html, [/<div[^>]+class="profile-block-content-service"[^>]*>/ig, /Подключ[её]нные услуги/i])[0];
	var servBlockDesc = getElement(html, /<div[^>]+class="img-block-desc"[^>]*>/i);
	var items = getElements(servBlockDesc, /<div[^>]+style="display[^>]*>/ig);
	
	if(items.length && items.length > 0){
		AnyBalance.trace('Найдено подключенных услуг: ' + items.length);
		
		for(var i=0; i<items.length; ++i){
	    	var item = items[i];
			var itemName = getParam(item, null, null, /title="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
		    var itemDesc = getParam(item, null, null, /<p[^>]+style="align-items[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
			var rxDesc = new RegExp(itemDesc, 'i');
			sumParam(itemName + (!rxDesc.test(itemName) ? ': ' + itemDesc : ''), result, 'services', null, null, null, create_aggregate_join(',<br> '));
		}
	}else{
		AnyBalance.trace ('Не удалось получить блок подключенных услуг');
		result.services = 'Нет данных';
	}
	
	if(AnyBalance.isAvailable(['operating_sum', 'arrival_sum', 'expense_sum', 'premium_sum', 'last_payment_sum', 'last_payment_date', 'last_oper_desc'])){
		var monthes = {0: 'Январь', 1: 'Февраль', 2: 'Март', 3: 'Апрель', 4: 'Май', 5: 'Июнь', 6: 'Июль', 7: 'Август', 8: 'Сентябрь', 9: 'Октябрь', 10: 'Ноябрь', 11: 'Декабрь'};
		var dt = new Date();
		
		html = AnyBalance.requestGet(baseurl + 'finance?y=' + dt.getFullYear() + '&m=' + n2(dt.getMonth()+1), g_headers);
		
		var financeBlock = getElement(html, /<div[^>]+finance-block[^>]*>/i);
		
		getParam(financeBlock, result, 'operating_sum', />\"?Наработка[\s\S]*?detail-header-item[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(financeBlock, result, 'arrival_sum', />\"?Приход[\s\S]*?detail-header-item[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(financeBlock, result, 'expense_sum', />\"?Расход[\s\S]*?detail-header-item[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(financeBlock, result, 'premium_sum', />\"?Премиум[\s\S]*?detail-header-item[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(monthes[dt.getMonth()] + ' ' + dt.getFullYear(), result, 'period');
		
		var paymentHistory = getElement(html, /<div[^>]+payment-history-block[^>]*>/i);
		var payments = getElements(paymentHistory, /<div[^>]+detail-content-history[^>]*>/ig);
		
		if(!payments || /detail-content-not/i.test(paymentHistory)){
			AnyBalance.trace('Платежей за текущий период не найдено. Проверяем платежи за предыдущий период...');
			
			var dt = new Date();
	        var dtPrev = new Date(dt.getFullYear(), dt.getMonth()-1, dt.getDate());
			
			html = AnyBalance.requestGet(baseurl + 'finance?y=' + dtPrev.getFullYear() + '&m=' + n2(dtPrev.getMonth()+1), g_headers);
			
			paymentHistory = getElement(html, /<div[^>]+payment-history-block[^>]*>/i);
		    payments = getElements(paymentHistory, /<div[^>]+detail-content-history[^>]*>/ig);
		}
		
		if(payments && payments.length && payments.length > 0){
			AnyBalance.trace('Найдено платежей: ' + payments.length);
			
			for(var i=0; i<payments.length; ++i){
	    	    var payment = payments[i];
				
				getParam(payment, result, 'last_payment_date', /<div[^>]+detail-header-item(?:[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDateISO);
				getParam(payment, result, 'last_payment_sum', /<div[^>]+detail-header-item(?:[^>]*>){5}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	            getParam(payment, result, 'last_oper_desc', /<div[^>]+detail-header-item(?:[^>]*>){7}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
			    
				break;
	        }
		}else{
            AnyBalance.trace('Не удалось получить данные по платежам');
        }
	}
	
	if(AnyBalance.isAvailable('address', 'fio')){
		html = AnyBalance.requestGet(baseurl + 'personal/info', g_headers);
		
		result.address = getParam(html, null, null, /Адрес установки[\s\S]*?<span[^>]+class="value"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode)||'Не указан';
		result.phone = getParam(html, null, null, /<div[^>]+class="passport"[^>]*>[\s\S]*?"phone"[^>]*>([\s\S]*?)<\/span>/i, [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'], html_entity_decode)||'Не указан';
		result.fio = getParam(html, null, null, /<div[^>]+class="passport"[^>]*>[\s\S]*?"title"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode)||'Не указано';
	}
	
	AnyBalance.setResult(result);
}