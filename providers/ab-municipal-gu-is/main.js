/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Для пользования провайдером требуется знать только код плательщика, который можно прочитать на квитанции: 

*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
	'X-Requested-With': 'XMLHttpRequest'
};

var g_headersQIWI = {
	'accept': 'application/vnd.qiwi.v1+json',
	'client-software': 'WEB v4.127.2',
	'content-type': 'application/json',
	'origin': 'https://qiwi.com',
    'referer': 'https://qiwi.com/',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
	'x-application-id': '0ec0da91-65ee-496b-86d7-c07afc987007',
    'x-application-secret': '66f8109f-d6df-49c6-ade9-5692a0b6d0a1'
};

var monthes = {0: 'Январь', 1: 'Февраль', 2: 'Март', 3: 'Апрель', 4: 'Май', 5: 'Июнь', 6: 'Июль', 7: 'Август', 8: 'Сентябрь', 9: 'Октябрь', 10: 'Ноябрь', 11: 'Декабрь'};

function main() {
	AnyBalance.setDefaultCharset('utf-8');
	
	var prefs = AnyBalance.getPreferences();
	
    var dt = new Date();
	
	switch(prefs.source){
    case 'vp':
	    try{
            findBillVP(dt);
        }catch(e){
            AnyBalance.trace('Запрос за период ' + (dt.getMonth()+1) + '-' + dt.getFullYear() + ' вернул ошибку: ' + e.message + '\nПробуем предыдущий период...');
            dt = new Date(dt.getFullYear(), dt.getMonth()-1, 1);
            findBillVP(dt);
        }
        break;
	case 'qiwi':
        try{
            findBillQIWI(dt);
        }catch(e){
            AnyBalance.trace('Запрос за период ' + (dt.getMonth()+1) + '-' + dt.getFullYear() + ' вернул ошибку: ' + e.message + '\nПробуем предыдущий период...');
            dt = new Date(dt.getFullYear(), dt.getMonth()-1, 1);
            findBillQIWI(dt);
        }
        break;
    case 'auto':
    default:
        try{
			try{
                findBillVP(dt);
            }catch(e){
                AnyBalance.trace('Запрос за период ' + (dt.getMonth()+1) + '-' + dt.getFullYear() + ' вернул ошибку: ' + e.message + '\nПробуем предыдущий период...');
                dt = new Date(dt.getFullYear(), dt.getMonth()-1, 1);
                findBillVP(dt);
            }
        }catch(e){
			AnyBalance.trace('Не удалось получить данные с сайта ВсеПлатежи: ' + e.message);
		    clearAllCookies();
			dt = new Date();
			try{
                findBillQIWI(dt);
            }catch(e){
                AnyBalance.trace('Запрос за период ' + (dt.getMonth()+1) + '-' + dt.getFullYear() + ' вернул ошибку: ' + e.message + '\nПробуем предыдущий период...');
                dt = new Date(dt.getFullYear(), dt.getMonth()-1, 1);
                findBillQIWI(dt);
            }
        }
        break;
	}
}

function findBillVP(dt){
    var prefs = AnyBalance.getPreferences();
	
	var month = '' + (dt.getMonth() + 1);
    if(month.length < 2) month = '0' + month;
	var year = dt.getFullYear();
	
    var html = AnyBalance.requestGet('https://vp.ru/', g_headers);
    
    if(!html || AnyBalance.getLastStatusCode() >= 500) {
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}
	
	html = AnyBalance.requestGet('https://vp.ru/pay/providerentry?provider_type=jkuepd&sub_provider_type=&sub_provider_type=', g_headers);
	
	var cid = getParam(html, null, null, /name="_cid" value="([^"]*)/i, replaceTagsAndSpaces);
	
	html = AnyBalance.requestGet('https://vp.ru/pay/jkuepd/check?accountNumber=' + prefs.login + '&periodMonth=' + month + '&periodYear=' + year + '&_cid=' + cid, g_headers);
	
    var json = getJson(html);
	
	if(json.result != 'SUCCESS') {
		var error = json.message || ((json.data && json.data.items) || []).map(function(e) { return e.message }).join('\n');
		if(error)
			throw new AnyBalance.Error(error, null, /номер|сч[её]т/i.test(error));	
		    
       	AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму ввода! Сайт изменен?');	
    }
	
    html = AnyBalance.requestGet('https://vp.ru/pay/jkuepd/form?accountNumber=' + prefs.login + '&periodMonth=' + month + '&periodYear=' + year + '&_cid=' + cid + '&sub_provider_type=', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() >= 500) {
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}
	
	var result = {success: true};
	
	getParam(monthes[dt.getMonth()] + ' ' + dt.getFullYear(), result, 'period');
    getParam(prefs.login + ' | ' + monthes[dt.getMonth()] + ' ' + dt.getFullYear(), result, '__tariff');
	getParam(prefs.login, result, 'payer_code');
	
	var payment = getJsonObject(html, /var payment = /);
	
	if(payment){ // Получаем из переменной скрипта
	    AnyBalance.trace('Ответ от внешней системы: ' + JSON.stringify(payment));
		var balance = getParam(0||payment.amount, result, 'balance', null, null, parseBalance);
        var strah = getParam(0||payment.amountInsurance, result, 'strah', null, null, parseBalance);
		getParam(balance + strah, result, 'balance_strah', null, null, parseBalance);
	    if(result.balance && result.balance != 0){
		    getParam('Счет ЕПД выставлен', result, 'status');
	    }else{
		    getParam('Нет счетов к оплате', result, 'status');
	    }
	}else{ // Получаем обычным способом
		AnyBalance.trace('Ответ от внешней системы: ' + html);
		var balance = getParam(html, null, null, /<div[^>]+class="calculationAmount"[^>]*>[\s\S]*?value="([^"]*)/i, replaceTagsAndSpaces);
		getParam(0||balance, result, 'balance', null, null, parseBalance);
		var strah = getParam(html, null, null, /<div[^>]+class="insurance"[^>]*>[\s\S]*?value="([^"]*)/i, replaceTagsAndSpaces);
		getParam(0||strah, result, 'strah', null, null, parseBalance);
		getParam(balance + strah, result, 'balance_strah', null, null, parseBalance);
		if(result.balance && result.balance != 0){
		    getParam('Счет ЕПД выставлен', result, 'status');
	    }else{
		    getParam('Нет счетов к оплате', result, 'status');
	    }
	}
    
    AnyBalance.setResult(result);
}

function findBillQIWI(dt){
    var prefs = AnyBalance.getPreferences();

    var month = '' + (dt.getMonth() + 1);
    if(month.length < 2) month = '0' + month;
	var year = dt.getFullYear();
	
    var html = AnyBalance.requestGet('https://qiwi.com/payment/form/198', g_headers);
    
    if(!html || AnyBalance.getLastStatusCode() >= 500) {
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}
		
    html = AnyBalance.requestPost('https://qiwi.com/oauth/token', {grant_type: 'anonymous', client_id: 'anonymous'}, g_headers);
		
    var json = getJson(html);
	
	if(!json.access_token){
		AnyBalance.trace(JSON.stringify(json));
		throw new AnyBalance.Error('Не удалось получить токен авторизации. Сайт изменен?')
	}
		
    g_headersQIWI['authorization'] = 'TokenHead ' + json.access_token;
		
    html = AnyBalance.requestPost('https://edge.qiwi.com/sinap/api/refs/58c16e8b-2a99-4568-a788-9272f7557ad5/containers', JSON.stringify({
	    account: prefs.login,
	    period: month + year.toString().substr(-2),
	    profileId: 'moscow'
	}), g_headersQIWI);
		
	var json = getJson(html);
		
	if(json.message || json.underlyingError) 
		throw new AnyBalance.Error(json.message || json.underlyingError.message, false, true)
		
	AnyBalance.trace('Ответ от внешней системы: ' + JSON.stringify(json));

    var result = {success: true};
	
	getParam(monthes[dt.getMonth()] + ' ' + dt.getFullYear(), result, 'period');
    getParam(prefs.login + ' | ' + monthes[dt.getMonth()] + ' ' + dt.getFullYear(), result, '__tariff');
	getParam(prefs.login, result, 'payer_code');
    
	var balance = getParam(0, result, 'balance');
	var strah = getParam(0, result, 'strah');
	getParam(balance + strah, result, 'balance_strah');
	getParam('Нет счетов к оплате', result, 'status');
		
	if(json.elements && json.elements.length > 0){
	    for(var i=0; i<json.elements.length; ++i){
	        var e = json.elements[i];
            if(e.name == 'sum' && e.value != 0){
				balance = getParam(e.value, result, 'balance', null, null, parseBalance);
				strah = getParam(0, result, 'strah', null, null, parseBalance);
				getParam(balance + strah, result, 'balance_strah', null, null, parseBalance);
				getParam('Счет ЕПД выставлен', result, 'status');
			}
	    }
	}else{
	    AnyBalance.trace('Не удалось получить информацию по счету. Сайт изменен?');
    }
    
    AnyBalance.setResult(result);
}