/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36;',
};

var baseurl = 'https://lk.kmv.ru/';

function main(){
    var prefs = AnyBalance.getPreferences();
    
    AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() >= 500){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}
	
	if(/<div class='login_page'>/i.test(html)){
		AnyBalance.trace('Похоже, мы в старом кабинете. Пробуем войти...');
		mainOld(html);
	}else{
		AnyBalance.trace('Похоже, мы в новом кабинете. Пробуем войти...');
		mainNew(html);
	}
	
    AnyBalance.setResult(result);
}

function mainOld(html){
	var prefs = AnyBalance.getPreferences();
    
    AnyBalance.setDefaultCharset('utf-8');
	
    var form = getElement(html, /<form[^>]+login form[^>]*>/i);
    if(!form){
        AnyBalance.trace(form);
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
    }
	
	var params = createFormParams(form, function(params, str, name, value){
		if(name == 'user[login]')
			return prefs.login;
		else if(name == 'user[password]')
			return prefs.password;			
		return value;
	});
	
	var action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
		
	html = AnyBalance.requestPost(joinUrl(baseurl, action), params, addHeaders({'Referer': AnyBalance.getLastUrl()}));
	
    if(!/new HupoApp\(\{/i.test(html)){
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }
	
    var result = {success: true};
	
	var token = getParam(html, null, null, /name="csrf-token" content="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
	
	var html = AnyBalance.requestGet(baseurl + 'accounts/' + prefs.login + '?_=' + new Date().getTime(), addHeaders({
		'Accept': 'application/json, text/javascript, */*; q=0.01',
		'Referer': baseurl,
		'X-Csrf-Token': token,
        'X-Requested-With': 'XMLHttpRequest'
	}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	var acc = json.data && json.data.personal_account;
	var serv = json.data && json.data.servs;
	var addr = json.data && json.data.equipment_addresses;
	
	getParam(acc.n_sum_bal, result, 'balance', null, null, parseBalance);
	getParam(acc.n_promised_pay_sum, result, 'promised', null, null, parseBalance);
	getParam(acc.n_recommended_pay, result, 'recommended', null, null, parseBalance);
	getParam(acc.n_overdraft, result, 'credit', null, null, parseBalance);
	getParam(acc.vc_account, result, 'acc_num', null, null);
	getParam(acc.n_last_payment_sum, result, 'last_payment_sum', null, null, parseBalance);
	getParam(acc.d_last_payment, result, 'last_payment_date', null, null, parseDateISO);
	getParam(acc.vc_last_payment_type, result, 'last_payment_type', null, null);
	getParam(acc.vc_last_payment_bank, result, 'last_payment_place', null, null);
	getParam(acc.d_accounting_begin, result, 'date_start', null, null, parseDateISO);
	getParam(acc.d_accounting_end, result, 'date_till', null, null, parseDateISO);
	getParam(acc.vc_subj_name, result, 'fio', null, null);
	
	if(serv && serv.length > 0){
		AnyBalance.trace('Найдено подключенных услуг: ' + serv.length);
		for(var i=0; i<serv.length; ++i){
	        var s = serv[i];
			AnyBalance.trace(JSON.stringify(s));
			
			sumParam(s.n_serv_amount_cur, result, 'abon', null, null, parseBalanceSilent, aggregate_sum);
			sumParam(s.vc_name, result, '__tariff', null, null, null, create_aggregate_join(', '));
		}
	}else{
		AnyBalance.trace('Не удалось найти информацию по подключенным услугам');
	}
	
	if(addr && addr.length > 0){
		AnyBalance.trace('Найдено адресов подключения: ' + addr.length);
		for(var i=0; i<addr.length; ++i){
	        var a = addr[i];
			AnyBalance.trace(JSON.stringify(a));
			
			sumParam(a.vc_visual_code, result, 'address', null, null, null, create_aggregate_join('. '));
		}
	}else{
		AnyBalance.trace('Не удалось найти информацию по адресам подключения');
	}
	
	if(isAvailable(['last_oper_date', 'last_oper_sum', 'last_oper_desc'])){
	    var dt = new Date();
	    var dtPrev = new Date(dt.getFullYear(), dt.getMonth()-1, dt.getDate());
	    var dateFrom = dtPrev.getFullYear() + '-' + n2(dtPrev.getMonth()+1) + '-' + n2(dt.getDate()) + 'T' + n2(dt.getHours()) + ':' + n2(dt.getMinutes()) + ':' + n2(dt.getSeconds());
	    var dateTo = dt.getFullYear() + '-' + n2(dt.getMonth()+1) + '-' + n2(dt.getDate()) + 'T' + n2(dt.getHours()) + ':' + n2(dt.getMinutes()) + ':' + n2(dt.getSeconds());
		
		
		html = AnyBalance.requestGet(baseurl + 'accounts/' + prefs.login + '/details?filter%5Bd_begin%5D=' + encodeURIComponent(dateFrom) + '&filter%5Bd_end%5D=' + encodeURIComponent(dateTo) + '&filter%5Bshow_payments%5D=1&filter%5Bshow_debits%5D=1&_=' + new Date().getTime(), addHeaders({
		    'Accept': 'application/json, text/javascript, */*; q=0.01',
		    'Referer': baseurl,
		    'X-Csrf-Token': token,
            'X-Requested-With': 'XMLHttpRequest'
	    }));
        
	    var json = getJson(html);
//	    AnyBalance.trace(JSON.stringify(json));
		
		json = json.data && json.data.account_details;
		
		if(json && json.length > 0){
			AnyBalance.trace('Найдено операций: ' + json.length);
			for(var i=0; i<json.length; ++i){
				var info = json[i];
				
				if(/Начальный остаток|Конечный остаток/i.test(info.vc_good_rem))
					continue;
				
				AnyBalance.trace(JSON.stringify(info));
				
				if(info.n_sum_inp){ // Это приход
					getParam(info.n_sum_inp, result, 'last_oper_sum', null, null, parseBalance);
				}else{ // Иначе выводим расход
					getParam(-(info.n_sum_out), result, 'last_oper_sum', null, null, parseBalance);
				}
				
				getParam(info.d_oper, result, 'last_oper_date', null, null, parseDateISO);
				getParam(info.vc_good_rem, result, 'last_oper_desc');
				
				break;
			}
		}else{
			AnyBalance.trace('Не удалось получить историю операций');
		}
    }
	
    AnyBalance.setResult(result);
}

function mainNew(html){
	var prefs = AnyBalance.getPreferences();
    
    AnyBalance.setDefaultCharset('utf-8');
	
	var form = getElement(html, /<form[^>]+role="form"[^>]*>/i);
    if(!form){
        AnyBalance.trace(form);
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
    }
	
	var params = createFormParams(form, function(params, str, name, value) {
	   	if(name == 'username') {
	   		return prefs.login;
    	}else if(name == 'password'){
	    	return prefs.password;
	    }
        	        
	    return value;
	});
	
	var action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
		
	html = AnyBalance.requestPost(joinUrl(baseurl, action), params, addHeaders({
		'Content-Type': 'application/x-www-form-urlencoded',
	    'Referer': AnyBalance.getLastUrl(),
	}));
	
	if(!/logout|new HupoApp/i.test(html)){
		var error = getParam(html, /<div[^>]+alert-danger[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		if(error)
			throw new AnyBalance.Error(error, null, /логин|парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};
	
	var items = getElements(html, /<div[^>]+class="numbers"[^>]*>/ig);
	
	if(items.length && items.length > 0){
		AnyBalance.trace('Найдено виджетов: ' + items.length);
		for(var i=0; i<items.length; ++i){
	    	var item = items[i];
			
			if(/Баланс/i.test(item)){
				getParam(item, result, 'balance', /<h5[^>]*>([\s\S]*?)<\/h5>\s*?<p[^>]*>Баланс/i, replaceTagsAndSpaces, parseBalance);
			}else if(/Обещанный плат[её]ж/i.test(item)){
				getParam(item, result, 'promised', /<h5[^>]*>([\s\S]*?)<\/h5>\s*?<p[^>]*>Обещанный плат[её]ж/i, replaceTagsAndSpaces, parseBalance);
			}else if(/Рекоменд\. плат[её]ж/i.test(item)){
                getParam(item, result, 'recommended', /<h5[^>]*>([\s\S]*?)<\/h5>\s*?<p[^>]*>Рекоменд\. плат[её]ж/i, replaceTagsAndSpaces, parseBalance);
			}else if(/Кредитный лимит/i.test(item)){
                getParam(item, result, 'credit', /<h5[^>]*>([\s\S]*?)<\/h5>\s*?<p[^>]*>Кредитный лимит/i, replaceTagsAndSpaces, parseBalance);
			}else if(/Лицевой сч[её]т/i.test(item)){
//				getParam(item, result, '__tariff', /<p[^>]*>Лицевой сч[её]т\s?№?\s?([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
	            getParam(item, result, 'acc_num', /<p[^>]*>Лицевой сч[её]т\s?№?\s?([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
				getParam(item, result, 'fio', /<h5[^>]*>([\s\S]*?)<\/h5>\s*?<p[^>]*>Лицевой сч[её]т/i, replaceTagsAndSpaces);
			}
	    }
	}else{
		AnyBalance.trace('Не удалось получить информацию по виджетам');
	}
	
    AnyBalance.setResult(result);
}