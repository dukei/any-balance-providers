/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Для пользования провайдером требуется знать только код плательщика, который можно прочитать на квитанции: 

*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
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

function main(){
    AnyBalance.setDefaultCharset('utf-8');

    var dt = new Date();
    try{
        findBill(dt);
    }catch(e){
		try{
            AnyBalance.trace('Запрос за период ' + (dt.getMonth()+1) + '-' + dt.getFullYear() + ' вернул ошибку: ' + e.message + '\nПробуем предыдущий период...');
            dt = new Date(dt.getFullYear(), dt.getMonth()-1, 1);
            findBill(dt);
        }catch(e){
            AnyBalance.trace('Запрос за период ' + (dt.getMonth()+1) + '-' + dt.getFullYear() + ' вернул ошибку: ' + e.message + '\nПробуем QIWI...');
            dt = new Date();
            findBillQIWI(dt);
        }
    }
}

function findBill(dt){
    var prefs = AnyBalance.getPreferences();

    var month = '' + (dt.getMonth() + 1);
    if(month.length < 2) month = '0' + month;

	var html = AnyBalance.requestGet('https://1.elecsnet.ru/NotebookFront/services/0mhp/default.aspx?merchantId=956', g_headers);

	html = AnyBalance.requestPost('https://1.elecsnet.ru/NotebookFront/services/0mhp/GetMerchantInfo', {
	    merchantId:	'956',
		paymentTool: '36',//9
		'merchantFields[1]': prefs.login,
		'merchantFields[2]': '01.' + month + '.' + dt.getFullYear(),
	}, addHeaders({Referer: AnyBalance.getLastUrl(), 'X-Requested-With': 'XMLHttpRequest' }));
	
	var json = getJson(html);
	if(!json.isSuccess){
		var error = json.message;
		if(/неверный номер плательщика/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if(error)
			throw new AnyBalance.Error(error);
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить баланс. Cайт изменен?');
	}

	AnyBalance.trace('Ответ от внешней системы: ' + json.message);

    var result = {success: true};

    getParam(month + '-' + dt.getFullYear(), result, 'period');
    getParam(prefs.login + ', ' + month + '-' + dt.getFullYear(), result, '__tariff');
	getParam(prefs.login, result, 'payer_code');
    
	if(json.billData.bills.length === 0){
        //Если счет просто оплачен, то не будем возвращать ошибку
        getParam(0, result, 'balance');
		getParam(json.billData.emptyMessage, result, 'status');
    }else{
        for(var i=0; i<json.billData.bills.length; ++i){
        	var bill = json.billData.bills[i];
        	if(/с уч[её]том страх/i.test(bill.label)){
        		getParam(bill.transferSumm, result, 'balance_strah');
        		getParam(bill.insurancePrice, result, 'strah');
        	}else{
        		getParam(bill.transferSumm, result, 'balance');
        	}
        }
        getParam('OK', result, 'status');
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
		
	if(json.message) 
		throw new AnyBalance.Error(json.message, false, true)
		
	AnyBalance.trace('Ответ от внешней системы: ' + JSON.stringify(json));

    var result = {success: true};

    getParam(month + '-' + dt.getFullYear(), result, 'period');
    getParam(prefs.login + ', ' + month + '-' + dt.getFullYear(), result, '__tariff');
	getParam(prefs.login, result, 'payer_code');
	getParam(0, result, 'balance');
	getParam('Нет счетов к оплате', result, 'status');
		
	if(json.elements && json.elements.length > 0){
	    for(var i=0; i<json.elements.length; ++i){
	        var e = json.elements[i];
            if(e.name == 'sum' && e.value != 0){
				getParam(e.value, result, 'balance');
				getParam('OK', result, 'status');
			}
	    }
	}else{
	    AnyBalance.trace('Не удалось получить информацию по счету. Сайт изменен?');
    }
    
    AnyBalance.setResult(result);
}