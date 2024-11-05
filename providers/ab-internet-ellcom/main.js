/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
    
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var cabType = prefs.type || 'individual';
	
	if(cabType == 'individual'){
		var baseurl = 'https://bill.ellco.ru/';
	}else{
		var baseurl = 'https://bill.ellcom.ru/';
	}
	
	var html = AnyBalance.requestGet(baseurl + 'bgbilling/pubexecuter?module=admin&action=Login', g_headers);
	
	if(AnyBalance.getLastStatusCode() > 400 || !html) {
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}

	var form = getElement(html, /<form[^>]+action[^>]*>/i);
	
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	}
	
	var params = createFormParams(form, function(params, str, name, value) {
		if (/user/i.test(name)) 
			return prefs.login;
		else if (/pswd/i.test(name))
			return prefs.password;

		return value;
	});
    
	var action = getParam(form, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
	
	html = AnyBalance.requestPost(joinUrl(baseurl, action), params, addHeaders({
	    'Content-Type': 'application/x-www-form-urlencoded',
		'Referer': AnyBalance.getLastUrl()
	}));
	
	if (!/action=Exit/i.test(html)) {
		var error = getElement(html, /<h2[^>]+class="line"[^>]*>([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Договор|пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	var dashboardQuery = getJsonObject(html, /dashboardQuery\s*?=\s*?/);
	AnyBalance.trace('dashboardQuery: ' + JSON.stringify(dashboardQuery));
	
	if(!dashboardQuery){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить параметры запроса. Сайт изменен?');
	}
	
	var query_mid = dashboardQuery.mid;
	var query_action = dashboardQuery.action;
	
	html = AnyBalance.requestPost(baseurl + 'bgbilling/webexecuter/' + query_mid + '/' + query_action, {
		'action': query_action,
        'mid': query_mid,
        'operation': 'list'
	}, addHeaders({
		'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
		'Referer': baseurl + 'bgbilling/webexecuter',
		'X-Requested-With': 'XMLHttpRequest'
	}));
	
	getParam(html, result, 'balance', /Баланс[\s\S]*?<div[^>]+class="fw-bold fs-1 mx-4"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'to_pay', /<div[^>]+class="fs-5 mx-4 text-info"[^>]*>К оплате:([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /Договор[\s\S]*?<div[^>]+class="fw-bold fs-1 mx-4"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'licschet', /Договор[\s\S]*?<div[^>]+class="fw-bold fs-1 mx-4"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'username', /<div[^>]+class="fs-5 mx-4 text-info" title=[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	
	var monthes = {0: 'Январь', 1: 'Февраль', 2: 'Март', 3: 'Апрель', 4: 'Май', 5: 'Июнь', 6: 'Июль', 7: 'Август', 8: 'Сентябрь', 9: 'Октябрь', 10: 'Ноябрь', 11: 'Декабрь'};
	var dt = new Date();
	
	if(AnyBalance.isAvailable('period', 'status', 'state', 'traffic_out', 'traffic_in')){
		var inetQuerySection = getElements(html, [/<li[^>]+class="tile tileHeight tilewMiddle"[^>]*>/ig, /Интернет/i]);
		var inetQuery = getParam(inetQuerySection + '', /href\s*?=\s*?['|"]([^'|"]*)/i, replaceHtmlEntities);
		var query_action = getParam(inetQuery + '', /.*\/([\s\S]*?)$/i, replaceTagsAndSpaces);
		var query_mid = getParam(inetQuery + '', /.*\/([\s\S]*?)\/.*$/i, replaceTagsAndSpaces);
		
		if(query_action && query_mid){
			html = AnyBalance.requestPost(baseurl + 'bgbilling/webexecuter/' + query_mid + '/' + query_action, {
		        'action': query_action,
                'mid': query_mid,
                'operation': 'accountList'
	        }, addHeaders({
		        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
		        'Referer': baseurl + 'bgbilling/webexecuter/' + query_mid + '/' + query_action,
		        'X-Requested-With': 'XMLHttpRequest'
	        }));
			
			getParam(monthes[dt.getMonth()] + ' ' + dt.getFullYear(), result, 'period');
			getParam(html, result, 'status', /Статус:([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, capitalizeFirstLetter);
			getParam(html, result, 'state', /Состояние:([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, capitalizeFirstLetter);
			
			var accountId = getParam(html, /accountId:([\s\S]*?)\}/i, replaceTagsAndSpaces);
			AnyBalance.trace('accountId: ' + accountId);
			
			if(accountId && AnyBalance.isAvailable('traffic_out', 'traffic_in')){
				html = AnyBalance.requestPost(baseurl + 'bgbilling/webexecuter/' + query_mid + '/' + query_action, {
		            'action': query_action,
                    'mid': query_mid,
					'accountId': accountId,
                    'operation': 'trafficReport'
	            }, addHeaders({
		            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
		            'Referer': baseurl + 'bgbilling/webexecuter/' + query_mid + '/' + query_action,
		            'X-Requested-With': 'XMLHttpRequest'
	            }));
				
				getParam(html, result, 'traffic_out', /Исходящий внешний \(([\s\S]*?)\)<\/div>/i, replaceTagsAndSpaces, parseTraffic);
	            getParam(html, result, 'traffic_in', /Входящий внешний \(([\s\S]*?)\)<\/div>/i, replaceTagsAndSpaces, parseTraffic);
			}
		}else{
			AnyBalance.trace('Не удалось получить ссылку на запрос данных по интернету');
		}
	}
	
	if(AnyBalance.isAvailable(['limit', 'last_oper_date', 'last_oper_sum', 'last_oper_type', 'last_oper_desc', 'last_operating_period', 'last_operating_sum_total', 'last_operating_sum', 'last_operating_type'])){
		var html = AnyBalance.requestPost(baseurl + 'bgbilling/widget/contract/headerBalanceInformer.jsp', addHeaders({
		    'Referer': baseurl + 'bgbilling/webexecuter',
		    'X-Requested-With': 'XMLHttpRequest'
	    }));
			
		var balanceQuery = getParam(html, /href\s*?=\s*?['|"]([^'|"]*)/i, replaceHtmlEntities);
		var query_action = getParam(balanceQuery + '', /.*\/([\s\S]*?)$/i, replaceTagsAndSpaces);
		var query_mid = getParam(balanceQuery + '', /.*\/([\s\S]*?)\/.*$/i, replaceTagsAndSpaces);
		
		if(query_action && query_mid){
			html = AnyBalance.requestPost(baseurl + 'bgbilling/webexecuter/' + query_mid + '/' + query_action, {
		        'action': query_action,
                'mid': query_mid,
                'operation': 'balanceInfo'
	        }, addHeaders({
		        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
		        'Referer': baseurl + 'bgbilling/webexecuter/' + query_mid + '/' + query_action,
		        'X-Requested-With': 'XMLHttpRequest'
	        }));
			
			getParam(html, result, 'limit', /Лимит:([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
			
			var paymentHistory = getElements(html, [/<div[^>]+class="tile"[^>]*>/ig, /Платежи/i]);
			var payments = getElements(paymentHistory + '', /<div[^>]+class="flexRow"[^>]*>/ig);
			
		    if(payments && payments.length && payments.length > 0){
				AnyBalance.trace('Найдено платежей: ' + payments.length);
				
		        getParam(payments[0], result, 'last_oper_date', /<div[^>]+class="flexRow"[^>]*>(?:[^>]*>){3}([\s\S]*?)</i, replaceTagsAndSpaces, parseDate);
                getParam(payments[0], result, 'last_oper_sum', /<div[^>]+class="flexRow"[^>]*>(?:[^>]*>){11}([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	            getParam(payments[0], result, 'last_oper_type', /<div[^>]+class="flexRow"[^>]*>(?:[^>]*>){5}([\s\S]*?)</i, replaceTagsAndSpaces, capitalizeFirstLetter);
			    getParam(payments[0], result, 'last_oper_desc', /<div[^>]+class="flexRow"[^>]*>(?:[^>]*>){8}([\s\S]*?)</i, replaceTagsAndSpaces, capitalizeFirstLetter);
		    }else{
                AnyBalance.trace('Не удалось получить данные по последнему платежу');
            }
			
			var operatingHistory = getElements(html, [/<div[^>]+class="tile"[^>]*>/ig, /Наработка/i]);
			var operatings = getElements(operatingHistory + '', /<div[^>]+class="flexRow"[^>]*>/ig);
			
		    if(operatings && operatings.length && operatings.length > 0){
				AnyBalance.trace('Найдено наработок: ' + operatings.length);
				
				var lastPeriod = getParam(operatings[0], null, null, /<div[^>]+class="flexRow"[^>]*>(?:[^>]*>){3}([\s\S]*?)</i, replaceTagsAndSpaces, capitalizeFirstLetter);
				
		        getParam(operatings[0], result, 'last_operating_period', /<div[^>]+class="flexRow"[^>]*>(?:[^>]*>){3}([\s\S]*?)</i, replaceTagsAndSpaces, capitalizeFirstLetter);
                getParam(operatings[0], result, 'last_operating_sum', /<div[^>]+class="flexRow"[^>]*>(?:[^>]*>){11}([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	            getParam(operatings[0], result, 'last_operating_type', /<div[^>]+class="flexRow"[^>]*>(?:[^>]*>){5}([\s\S]*?)</i, replaceTagsAndSpaces, capitalizeFirstLetter);
				
				for(var i=0; i<operatings.length; ++i){
	    	        var operating = operatings[i];
					
					var period = getParam(operating, null, null, /<div[^>]+class="flexRow"[^>]*>(?:[^>]*>){3}([\s\S]*?)</i, replaceTagsAndSpaces, capitalizeFirstLetter);
					
					if((period + '') !== (lastPeriod + ''))
						continue;
					
					sumParam(operating, result, 'last_operating_sum_total', /<div[^>]+class="flexRow"[^>]*>(?:[^>]*>){11}([\s\S]*?)</i, replaceTagsAndSpaces, parseBalanceSilent, aggregate_sum);
	            }
		    }else{
                AnyBalance.trace('Не удалось получить данные по последней наработке');
            }
		}else{
			AnyBalance.trace('Не удалось получить ссылку на запрос данных по наработке');
		}
    }
	
	AnyBalance.setResult(result);
}

function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
