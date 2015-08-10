/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://lk.maryno.net/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	
	html = AnyBalance.requestPost(baseurl + 'auth', {
		username: prefs.login,
		password: prefs.password,
	}, addHeaders({Referer: baseurl + 'login'}));
	
	if (!/type_jur":0/i.test(html)) {
		var errors = {'no such user':'Такого пользователя не существует!', 'wrong password':'Неправильный пароль!'};
		var error = errors[html];
		if (error)
			throw new AnyBalance.Error(error, null, /Такого пользователя не существует|Неправильный пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet('https://lk.maryno.net/api/user/contract');
	
	var contract_id = getParam(html, null, null, /contract_id\":(.*?),/i);
	
	html = AnyBalance.requestPost('https://lk.maryno.net/api/user/contract/' + contract_id);
	
	html = AnyBalance.requestGet('https://lk.maryno.net/api/user/subscriber');
	
	var subscriber_id = getParam(html, null, null, /subscriber_id\":(.*?),/i);
	
	html = AnyBalance.requestPost('https://lk.maryno.net/api/user/subscriber/' + subscriber_id);
	
	html = AnyBalance.requestGet('https://lk.maryno.net/api/user/product');
	
	var product_id = getParam(html, null, null, /product_id\":(.*?),/i);
	
	html = AnyBalance.requestPost('https://lk.maryno.net/api/user/product/' + product_id);
	
	html = AnyBalance.requestGet('https://lk.maryno.net/api/user/all');
	
	var result = {success: true};
	
	var json = getJson(html);
	
	getParam(json.number, result, 'number', null, replaceTagsAndSpaces, html_entity_decode);
	getParam(json.contract_num, result, 'dogovor', null, replaceTagsAndSpaces, html_entity_decode);
	getParam(json.fio, result, 'FIO', null, replaceTagsAndSpaces, html_entity_decode);
	getParam(json.address, result, 'address', null, replaceTagsAndSpaces, html_entity_decode);
	getParam(json.date_begin, result, 'start_day', null, replaceTagsAndSpaces, parseDateISO);
	getParam(json.balance + '', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.bonusBalance + '', result, 'bonus_balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.plan, result, '__tariff', null, replaceTagsAndSpaces, html_entity_decode);
	getParam(json.turnbackBalance + '', result, 'credit', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.blockStatus.isBlocked+'', result, 'status', null, replaceTagsAndSpaces, function (str) {if (str == 0) return "Не блокирован"; else return str;});
	
	if(isAvailable('email')) {
		html = AnyBalance.requestGet('https://lk.maryno.net/api/user/email');
		
		json = getJson(html);
		if(isset(json.value))
			getParam(json.value+'', result, 'email', null, replaceTagsAndSpaces, html_entity_decode);
	}
	
	function getDetails(url, result, inName, outName) {
		html = AnyBalance.requestGet(url);
		json = getJson(html);
		
		for(var i = 0; i < json.length; i++) {
			var curr = json[i];
			
			sumParam(curr.incoming + '', result, inName, null, [replaceTagsAndSpaces, /(.+)/, '$1 b'], parseTraffic, aggregate_sum);
			sumParam(curr.outgoing + '', result, outName, null, [replaceTagsAndSpaces, /(.+)/, '$1 b'], parseTraffic, aggregate_sum);
		}
	}
	
	if(isAvailable(['traffic_month_in','traffic_month_out', 'traffic_last_month_in', 'traffic_last_month_out'])) {
		html = AnyBalance.requestGet('https://lk.maryno.net/api/accounts');
		
		json = getJson(html);
		var ip_address = json[0].ip_address;
		
       	var date = new Date();
		var month = (date.getMonth()+1);
		var year = date.getFullYear();
		
		getDetails('https://lk.maryno.net/api/accounts/details/month/'+ip_address+'/'+year+'/'+month, result, 'traffic_month_in', 'traffic_month_out');
		
		month = month - 1;
		if (month == 0) {year--; month = 12;}
		
		getDetails('https://lk.maryno.net/api/accounts/details/month/'+ip_address+'/'+year+'/'+month, result, 'traffic_last_month_in', 'traffic_last_month_out');
	}
	
	AnyBalance.setResult(result);
}