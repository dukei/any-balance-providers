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
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
};

var baseurl = 'http://netstat.atnr.ru/';

var acc_status = {
	true: 'Активный',
	false: 'Неактивный',
	undefined: 'Не определен'
};

function main() {
    var prefs = AnyBalance.getPreferences();
    
    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    var html = AnyBalance.requestGet(baseurl + 'cabinet/', addHeaders({'Referer': baseurl}));

    if(!html || AnyBalance.getLastStatusCode() > 400){
            AnyBalance.trace(html);
            throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
	html = AnyBalance.requestPost(baseurl + 'customer_api/login', JSON.stringify({
        'login': prefs.login,
        'password': prefs.password,
        'mobile_telephone': ''
    }), addHeaders({'Content-Type': 'application/json;charset=UTF-8', 'Referer': baseurl + 'cabinet/'}));
	
	var json = getJson(html);
	
	if(!json.sid_customer || json.error){
		var error = json.error;
		if(error)
			throw new AnyBalance.Error(error, null, /user|логин|password|парол/i.test(html));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	html = AnyBalance.requestGet(baseurl + 'customer_api/auth/profile', g_headers);
	
	var json = getJson(html);
	
	AnyBalance.trace('Profile: ' + JSON.stringify(json));
	
	for(var i=0; i<json.tariffs.length; ++i){
		sumParam(json.tariffs[i].name, result, '__tariff', null, null, null, create_aggregate_join(', '));
		sumParam(json.tariffs[i].name, result, 'currentTariff', null, null, null, create_aggregate_join(',\n '));
	}
	
	getParam(json.balance + '', result, 'balance', null, null, parseBalance);
	getParam(json.credit + '', result, 'credit', null, null, parseBalance);
	getParam(json.payment_in_month + '', result, 'cost', null, null, parseBalance);
	getParam(json.basic_account, result, 'accountID');
	if(json.actual_address)
	    getParam(json.actual_address, result, 'adress');
	if(json.email)
	    getParam(json.email, result, 'email');
	if(json.mobile_telephone)
	    getParam(json.mobile_telephone, result, 'phone', null, [replaceTagsAndSpaces, /.*(\d{3})-(\d{3})-(\d{2})-(\d{2})$/, '+7 $1 $2-$3-$4']);
	getParam(json.full_name, result, 'fio');
	
	if(json.accounts && json.accounts.length > 0){
		var ag = [];
		var s = {};
	    for(var i=0; i<json.accounts.length; ++i){
		    var servicesGroups = json.accounts[i].services;
		    for(var j=0; j<servicesGroups.length; ++j){
				var cost = getParam(servicesGroups[j].cost + '', null, null, null, null, parseBalance);
				
				sumParam(servicesGroups[j].name + ': ' + cost + ' ₽', s, '__s', null, null, null, create_aggregate_join(',\n '));
		    }
			ag.push(s.__s);
	    }
		result['services'] = ag.join('.\n ');
	}else{
		AnyBalance.trace('Не удалось получить информацию по услугам');
	}
	
	html = AnyBalance.requestGet(baseurl + 'customer_api/auth/statistics', g_headers);
	
	var json = getJson(html);
	
	AnyBalance.trace('Statistics: ' + JSON.stringify(json));
	
	if(json && json.length > 0){
	    var dtc = new Date();
	    var dtcPeriod = n2(dtc.getMonth()+1) + '.' + dtc.getFullYear();
        
		var dte = new Date(dtc.getFullYear(), dtc.getMonth()+1, 1);
		var dtEndPeriod = n2(dte.getDate()) + '.' + n2(dte.getMonth()+1) + '.' + dte.getFullYear();
		
		getParam(dtEndPeriod, result, 'deadline', null, null, parseDate);
	
	    var monthes = {0: 'Январь', 1: 'Февраль', 2: 'Март', 3: 'Апрель', 4: 'Май', 5: 'Июнь', 6: 'Июль', 7: 'Август', 8: 'Сентябрь', 9: 'Октябрь', 10: 'Ноябрь', 11: 'Декабрь'};
	
	    getParam(monthes[dtc.getMonth()] + ' ' + dtc.getFullYear(), result, 'period');
	
	    for(var i=0; i<json.length; ++i){
		    var dt = new Date(json[i].actual_date*1000);
			var dtPeriod = n2(dt.getMonth()+1) + '.' + dt.getFullYear();
		
		    if(dtPeriod == dtcPeriod && json[i].payment_incurrency < 0){
		        sumParam(json[i].payment_incurrency, result, 'writtenOff', null, null, parseBalance, aggregate_sum);
		    }
	    }
	}else{
		AnyBalance.trace('Не удалось получить информацию по статистике');
	}
	
    AnyBalance.setResult(result);
}