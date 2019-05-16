/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Для пользования провайдером требуется знать только код плательщика, который можно прочитать на квитанции: 

*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36',
};

function main(){
    AnyBalance.setDefaultCharset('utf-8');

    var dt = new Date();
    try{
        findBill(dt);
    }catch(e){
        AnyBalance.trace('Запрос за период ' + (dt.getMonth()+1) + '-' + dt.getFullYear() + ' вернул ошибку: ' + e.message + '\nПробуем предыдущий период...');
        dt = new Date(dt.getFullYear(), dt.getMonth()-1, 1);
        findBill(dt);
    }
}

function findBill(dt){
    var prefs = AnyBalance.getPreferences();

    var month = '' + (dt.getMonth() + 1);
    if(month.length < 2) month = '0' + month;

	var html = AnyBalance.requestGet('https://1.elecsnet.ru/NotebookFront/services/0mhp/merchantId=956', g_headers);

	html = AnyBalance.requestPost('https://1.elecsnet.ru/NotebookFront/services/0mhp/GetMerchantInfo', {
	    merchantId:	'956',
		paymentTool: '9',
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
    
    if(json.billData.bills.length === 0){
        //Если счет просто оплачен, то не будем возвращать ошибку
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

