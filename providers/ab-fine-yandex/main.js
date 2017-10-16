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
	
	checkEmpty(/^.{10}$/.test(prefs.prava), 'Введите номер водительского удостоверения (10 символов)!');
	checkEmpty(/^.{10}$/.test(prefs.regcert), 'Введите номер свидетельства о регистрации ТС (10 символов)!');
	
    var baseurl = 'https://money.yandex.ru';
    AnyBalance.setDefaultCharset('utf-8');

	var url = baseurl + '/debts/?driverLicense=' + encodeURIComponent(prefs.prava) + '&registrationCertificate=' + encodeURIComponent(prefs.regcert) + '&subscribe=&subscribeType=&userEmail=&userPhone=';
	var html = AnyBalance.requestGet(url, g_headers);

	var tries = 0;
	do{
		html = AnyBalance.requestGet(baseurl + '/ajax/search-debts?ref=&driverLicense=' + encodeURIComponent(prefs.prava) + '&registrationCertificate=' + encodeURIComponent(prefs.regcert), 
			addHeaders({'X-Requested-With': 'XMLHttpRequest', Origin: baseurl, Referer: url}));

		var info = getJson(html);
		if(info.status == 'inProgress' && tries < 10){
			tries++;
			AnyBalance.trace('Штрафы запрашиваются (попытка ' + (tries+1) + '/10)');
			AnyBalance.sleep(3000);
		}else {
			break;
		}
	}while(true);

	if(info.status != 'success' && !isArray(info.fines)){
		if(info.error)
			throw new AnyBalance.Error(info.error, null, /length must be/i.test(info.error));
		
		throw new AnyBalance.Error('Не удалось получить данные о штрафах! Проверьте правильность ввода номера водительского удостоверения и свидетельства о регистрации');
	}

	var result = {success: true};
	
	var length = info.fines ? info.fines.length : 0;
	getParam(length, result, 'count');
	getParam(0, result, 'balance');

	var fine, all='';
	for(var i=length-1; i>=0; --i) {
	    fine = info.fines[i].content;
		sumParam(fine.payUntil, result, 'payTill', null, null, parseDate, aggregate_min);
		sumParam(fine.sum, result, 'balance', null, null, null, aggregate_sum);

		all += '<b>' + fine.sum + '</b> - ' + fine.billFor + ' от ' + fine.billDate + '<br\><br\>';
	}

	if(fine) {
		getParam(all, result, 'all', null, [/<br\><br\>$/, '']);
		getParam(fine.sum, result, 'summ');
		getParam(fine.billDate, result, 'date', null, null, parseDate);
		getParam(fine.discountDate, result, 'discountDate', null, null, parseDate);
		getParam(fine.billFor, result, 'descr');
		getParam(fine.payLink, result, 'postanovlenie', /uin=([^&]*)/i, null, decodeURIComponent);
	}

    AnyBalance.setResult(result);
}
