/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'
};

var baseurl = 'https://cabinet.radiointernet1.ru';
var g_savedData;

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	if(!g_savedData)
		g_savedData = new SavedData('radiointernet1', prefs.login);

	g_savedData.restoreCookies();
		
	var html = AnyBalance.requestGet(baseurl + '/options/', g_headers);
	
	if (!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
	if(!/logout/i.test(html)){
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
	    
	    var html = AnyBalance.requestGet(baseurl + '/options/', g_headers);
		
		var form = AB.getElement(html, /<form[^>]+name="formlogin"[^>]*>/i);
	    if(!form){
		    AnyBalance.trace(html);
		    throw new AnyBalance.Error('Не удалось найти форму входа! Сайт изменен?');
	    }
	       
	    var params = AB.createFormParams(form, function(params, str, name, value) {
		    if (name == 'login') {
			    return prefs.login;
		    } else if (name == 'password') {
			    return prefs.password;
		    } else if (name == 'rememberme') {
			    return '1';
		    }
	          
		    return value;
	    });
		
	    html = AnyBalance.requestPost(baseurl + '/options/', params, addHeaders({
       	    'Content-Type': 'application/x-www-form-urlencoded',
		    'Origin': baseurl,
       	    'Referer': baseurl + '/options/'
	    }), g_headers);
        
        if(!/logout/i.test(html)){
            var error = getParam(html, null, null, /<ul[^>]+class="form-errors"[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
            if(error)
                throw new AnyBalance.Error(error, null, /неверн|номер|логин|парол/i.test(error));
		    
            AnyBalance.trace(html);
		    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
        }
		
		g_savedData.setCookies();
	    g_savedData.save();
	}else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}
	
	var result = {success: true};

    getParam(html, result, 'balance', /<span[^>]+id="header-balance"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'contract', /Договор\s*<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'address', /<th[^>]*>Адрес установки:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'region', /<th[^>]*>Регион:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'email', /<th[^>]*>E-mail:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'phone', /<th[^>]*>Мобильный телефон:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4']);
	getParam(html, result, 'client', /<p[^>]+id="client-name"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
	
	html = AnyBalance.requestGet(baseurl + '/service/', addHeaders({'Referer': baseurl + '/options/'}), g_headers);
	
	getParam(html, result, 'abon', /<th[^>]*>Абон[ентская|\.]*\s*плата:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /<th[^>]*>Статус подключения:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, capitalizeFirstLetter);
	getParam(html, result, 'platform', /<th[^>]*>Платформа:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /<th[^>]*>Тариф:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'next_pay_date', /<th[^>]*>Списание[\s\S]*?:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDateWord);
	getParam(html, result, 'traffic_rest', /<th[^>]*>Трафик[\s\S]*?:[\s\S]*?<td[^>]*>([\s\S]*?)\/(?:[\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTraffic);
	getParam(html, result, 'traffic_total', /<th[^>]*>Трафик[\s\S]*?:[\s\S]*?<td[^>]*>(?:[\s\S]*?)\/([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTraffic);
	getParam(html, result, 'add_traffic_cost', /<th[^>]*>Стоимость доп[олнительного|\.]*\s*трафика:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'add_traffic_use', /<th[^>]*>Использовать доп[олнительный|\.]*\s*трафик[\s\S]*?:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'traffic_limit', /<th[^>]*>Ограничение трафика[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'tariff_autoactivate', /<th[^>]*>Автоактивация[\s\S]*?<span[^>]+class="active-color"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'site_id', /Site ID:\s*<a[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);
	
	if(AnyBalance.isAvailable('terminal', 'terminal_status', 'association_date', 'mac_address', 'ip_addresses')){
	    html = AnyBalance.requestGet(baseurl + '/service/terminal/', addHeaders({'Referer': baseurl + '/service/'}), g_headers);
	    
	    getParam(html, result, 'terminal', /<dt[^>]+class="active"[^>]*>([\s\S]*?)<\/dt>/i, replaceTagsAndSpaces);
	    getParam(html, result, 'terminal_status', /<dt[^>]+class="service-active active"[^>]*>[\s\S]*?Статус:([\s\S]*?)\|(?:[\s\S]*?)<\/dt>/i, replaceTagsAndSpaces, capitalizeFirstLetter);
	    getParam(html, result, 'association_date', /<dt[^>]+class="service-active active"[^>]*>(?:[\s\S]*?)\|[\s\S]*?Дата ассоциации([\s\S]*?)<\/dt>/i, replaceTagsAndSpaces, parseDateISO);
	    getParam(html, result, 'mac_address', /<th[^>]*>MAC:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	    getParam(html, result, 'ip_addresses', /<th[^>]*>Сеть IP-адресов:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	}
	
	if(AnyBalance.isAvailable('last_bill_num', 'last_bill_date', 'last_bill_sum', 'last_bill_pay_date', 'last_bili_pay_system')){
		html = AnyBalance.requestGet(baseurl + '/accounts/invoice/page/1', addHeaders({'Referer': baseurl + '/accounts/'}), g_headers);
		
		var table = getElement(html, /История пополнения баланса[\s\S]*?<table[^>]+table[^>]*>/i);
	    var bills = getElements(table, [/<tr[^>]*>/ig, /<td[^>]*>/i]);
	
	    if(bills.length && bills.length > 0){
			AnyBalance.trace('Найдено пополнений баланса: ' + bills.length);
		    for(var i=0; i<bills.length; ++i){
	    	    var bill = bills[i];
				
				getParam(bill, result, 'last_bill_num', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
				getParam(bill, result, 'last_bill_date', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDateWord);
		        getParam(bill, result, 'last_bill_sum', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
				getParam(bill, result, 'last_bill_pay_date', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDateWord);
				getParam(bill, result, 'last_bili_pay_system', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
				
			    break;
	        }
		}else{
			AnyBalance.trace('Не удалось получить данные статистики пополнений баланса');
		}
	}
	
	if(isAvailable('incoming_traffic', 'outgoing_traffic', 'total_expense_traffic', 'total_expense_sum')) {
		html = AnyBalance.requestGet(baseurl + '/service/statistics/', addHeaders({'Referer': baseurl + '/service/'}), g_headers);
		
		var table = getElement(html, /<table[^>]+class="classic-table"[^>]*>/i);
	    var items = getElements(table, /<tr[^>]*>/ig);
		
		if(items.length && items.length > 0){
		    for(var i=0; i<items.length; ++i){
	    	    var item = items[i];
				
				if(/Трафик/i.test(item)){
					if(/Исходящий/i.test(item)){
					    sumParam(item, result, 'incoming_traffic', /<td[^>]+class="ncell">([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, /^([\s\S]*?)$/i, '$1 Мб'], parseTraffic, aggregate_sum);
					}else if(/Входящий/i.test(item)){
						sumParam(item, result, 'outgoing_traffic', /<td[^>]+class="ncell">([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, /^([\s\S]*?)$/i, '$1 Мб'], parseTraffic, aggregate_sum);
					}
				}else{
					continue;
				}
	        }
			
			getParam(table, result, 'total_expense_traffic', /Итого:(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, /^([\s\S]*?)$/i, '$1 Мб'], parseTraffic);
			getParam(table, result, 'total_expense_sum', /Итого:(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		}else{
			AnyBalance.trace('Не удалось получить данные совокупной статистики по терминалу');
		}
	}
	
	if(isAvailable('all')) {
		html = AnyBalance.requestGet(baseurl + '/accounts/statistic/', addHeaders({'Referer': baseurl + '/accounts/upd/'}), g_headers);
		
		var table = getElement(html, /<table[^>]+class="statistic-table"[^>]*>/i);
	    var items = getElements(table, /<tr[^>]*>/ig);
		
		if(items && items.length > 0){
			for(var i=0; i<items.length; ++i){
				var item = items[i];
				
				var title = getParam(item, null, null, /(?:[\s\S]*?<th[^>]*>){1}([\s\S]*?)<\/th>/i, replaceTagsAndSpaces);
				var value = getParam(item, null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, /руб[\.|лей|ля|ль]*/ig, '₽']);
                
				sumParam(title + ': ' + value, result, 'all', null, null, null, create_aggregate_join('.\n '));
			}
		}else{
		    AnyBalance.trace('Не удалось получить данные совокупной статистики по счету');
			result.all = 'Нет данных';
	    }
	}
	
	AnyBalance.setResult(result);
}

function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
