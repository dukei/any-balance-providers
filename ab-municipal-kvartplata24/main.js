 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

var monthsArray = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://lk.kvp24.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'lk/login.jsp', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'lk/j_spring_security_check', {
		j_username: prefs.login,
		j_password: prefs.password,
		'_spring_security_remember_me': 'on'
	}, addHeaders({Referer: baseurl + 'lk/login.jsp'}));

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error) throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var dt = new Date();
	var year = dt.getFullYear();
	var p = {'year': year+''};
	var result = {success: true};
	
	if(isAvailable(['balance', 'date'])) {
		html = AnyBalance.requestPost(baseurl + 'lk/payment/getDataByYear', JSON.stringify(p), addHeaders( {
			Referer: baseurl + 'lk/payment',
			Accept:'*/*',
			'X-Requested-With':'XMLHttpRequest',		
		}));
		
		var paymentsJson = getJson(html);
		var lastPayment = paymentsJson[paymentsJson.length-1];
		
		getParam(lastPayment.totalAmount+'', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
		getParam(lastPayment.date+'', result, 'date', null, replaceTagsAndSpaces, parseBalance);
	}

	if(isAvailable(['balance', 'date'])) {
		html = AnyBalance.requestPost(baseurl + 'lk/history/getDataByYear', JSON.stringify(p), addHeaders( {
			Referer: baseurl + 'lk/payment',
			Accept:'*/*',
			'X-Requested-With':'XMLHttpRequest',		
		}));		
		
		var historyJson = getJson(html);
		
		var m = dt.getMonth();
		
		for(i = 0; i < historyJson.length; i++) {
			var curr = historyJson[i];
			
			if(prefs.usluga) {
				if(prefs.usluga == curr.facilityGroup) {
					parseElectricity(curr, result, m);
					break;
				}
			} else {
				parseElectricity(curr, result, m);
				break;
			}
		}
	}	
	
	AnyBalance.setResult(result);
}

function parseElectricity(curr, result, m) {
	getParam(curr.facilityGroup+'', result, 'facilityGroup', null, replaceTagsAndSpaces);
	getParam(curr.serialNumber+'', result, 'serialNumber', null, replaceTagsAndSpaces);
	getParam(curr[monthsArray[m-1]+'Readings']+'', result, 'usluga_balance', null, replaceTagsAndSpaces, parseBalance);
}