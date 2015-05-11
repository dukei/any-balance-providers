/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'application/json, text/javascript, */*; q=0.01',
	'Accept-Language':'ru,en;q=0.8',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();

	checkEmpty(prefs.prava, 'Введите номер водительского удостоверения!');
	checkEmpty(prefs.prava.length == 10, 'Номер водительского удостоверения должен состоять из 10 символов!');
	checkEmpty(prefs.regcert, 'Введите номер свидетельства о регистрации ТС!');
	checkEmpty(prefs.regcert.length == 10, 'Номер свидетельства о регистрации должен состоять из 10 символов!');
	
    var baseurl = 'https://money.yandex.ru';
    AnyBalance.setDefaultCharset('utf-8');

	var url = baseurl + '/debts/?driverLicense=' + encodeURIComponent(prefs.prava) + '&registrationCertificate=' + encodeURIComponent(prefs.regcert) + '&subscribe=&subscribeType=&userEmail=&userPhone=';
	var html = AnyBalance.requestGet(url, g_headers);

	var tries = 0;
	do{
		html = AnyBalance.requestPost(baseurl + '/debts/index.xml', {
			action: 'checkDebts',
			driverLicense: prefs.prava,
			registrationCertificate: prefs.regcert,
			dataChanged: '1',
			payerName: '',
			ref: ''
		}, addHeaders({'X-Requested-With': 'XMLHttpRequest', Origin: baseurl, Referer: url}));

		var info = getJson(html);
		if(info.status == 'inProgress' && tries < 10){
			tries++;
			AnyBalance.trace('Штрафы запрашиваются (попытка ' + (tries+1) + '/10)');
			AnyBalance.sleep(3000);
		}else{
			break;
		}
	}while(true);

	if(info.status == 'error'){
		throw new AnyBalance.Error(info.error, null, /length must be/i.test(info.error));
	}

	var result = {success: true};
	var length = info.data ? info.data.length : 0;
	getParam(length, result, 'count');
	getParam(0, result, 'balance');

	var fine, all='';
	for(var i=0; i<length; ++i){
	    fine = info.data[i];
		sumParam(fine.PayUntil, result, 'payTill', null, null, parseDateISO, aggregate_min);
		sumParam(fine.TotalAmount, result, 'balance', null, null, parseBalance, aggregate_sum);


		all += '<b>' + fine.TotalAmount + '</b> - ' + fine.SupplierBillID + ' от ' + fine.BillDate + '<br\>\n';
	}

	if(fine){
		getParam(all, result, 'all');
		getParam(fine.TotalAmount, result, 'summ', null, null, parseBalance);
		getParam(fine.BillDate, result, 'date', null, null, parseDate);
		getParam(fine.BillFor, result, 'descr');
		getParam(fine.SupplierBillID, result, 'postanovlenie');
	}

    AnyBalance.setResult(result);
}
