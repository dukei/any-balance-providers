/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.6,en;q=0.4',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36'
};

var baseurl = 'https://lk.cosmos-telecom.by';
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+$1 ($2) $3-$4-$5'];

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var html = AnyBalance.requestPost(baseurl + '/api/v1/auth/login', JSON.stringify({
        "username": prefs.login,
        "passwd": prefs.password
    }), addHeaders({
        'accept': 'application/json, text/plain, */*',
		'content-type': 'application/json',
		'origin': baseurl,
		'Referer': baseurl + '/login/contract'
	}));
	
	if(!html || AnyBalance.getLastStatusCode() > 500)
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже');
	
	if (/Пользователь не найден/i.test(html)) {
       	AnyBalance.trace(html);
       	throw new AnyBalance.Error('Неправильный логин или пароль!');
    }
	
	var json = getJson(html);
	AnyBalance.trace('Данные пользователя: ' + JSON.stringify(json));
	
	var result = {success: true};
	
	getParam(json.user_info.phone_notify, result, 'phone', null, replaceNumber);
	getParam(json.user_info.username, result, 'fio');
	getParam(json.user_info.address, result, 'address');
	
	html = AnyBalance.requestGet(baseurl + '/api/v1/user/get-accounts', addHeaders({
		'accept': 'application/json, text/plain, */*',
		'referer': baseurl + '/'
	    }));
	
	var json = getJson(html);
	AnyBalance.trace('Лицевые счета: ' + JSON.stringify(json));
	
	AnyBalance.trace('Найдено лицевых счетов: ' + json.list_addresses.length);

	if(json.list_addresses.length < 1)
		throw new AnyBalance.Error('У вас нет ни одного лицевого счета');

	var curAcc;
	for(var i=0; i<json.list_addresses.length; ++i){
		var acc = json.list_addresses[i];
		AnyBalance.trace('Найден лицевой счет ' + acc.account);
		if(!curAcc && (!prefs.num || endsWith(acc.account, prefs.num))){
			AnyBalance.trace('Выбран лицевой счет ' + acc.account);
			curAcc = acc;
		}
	}

	if(!curAcc)
		throw new AnyBalance.Error('Не удалось найти лицевой счет с последними цифрами ' + prefs.num);
	
	var account = curAcc.account;
	var accountId = curAcc.account_id;

	getParam(curAcc.account, result, 'account');
	getParam(curAcc.balance, result, 'balance', null, null, parseBalance);

    html = AnyBalance.requestGet(baseurl + '/api/v1/user/get-services-by-account?account_id=' + accountId, addHeaders({
		'accept': 'application/json, text/plain, */*',
		'referer': baseurl + '/'
	    }));
	
	var json = getJson(html);
	AnyBalance.trace('Подключенные услуги: ' + JSON.stringify(json));
	
	if (json) {
	    getParam(json.tariff[0].good_name, result, '__tariff');
	    getParam(json.tariff[0].price, result, 'cost', null, null, parseBalance);
		getParam(json.services[0].date_start, result, 'date_start', null, null, parseDate);
		getParam(json.services[0].date_end, result, 'date_end', null, null, parseDate);
		getParam(json.equipment[0].good_name, result, 'good_name');
	} else AnyBalance.trace('Не удалось найти информацио об услугах');

    html = AnyBalance.requestGet(baseurl + '/api/v1/user/get-sum-to-pay?account=' + account, addHeaders({
		'accept': 'application/json, text/plain, */*',
		'referer': baseurl + '/'
	    }));
	
	var json = getJson(html);
	AnyBalance.trace('Данные по оплате: ' + JSON.stringify(json));

	if(json) {
	    getParam(json.account_balance, result, 'balance', null, null, parseBalance);
	    getParam(json.balance, result, 'recommended', null, null, parseBalanceMy);
	    getParam(json.fio, result, 'fio');
	} else AnyBalance.trace('Не удалось найти информацио по оплате');

    html = AnyBalance.requestGet(baseurl + '/api/v1/user/get-last-payment?account_id=' + accountId, addHeaders({
		'accept': 'application/json, text/plain, */*',
		'referer': baseurl + '/'
	    }));
	
	var json = getJson(html);
	AnyBalance.trace('Последний платеж: ' + JSON.stringify(json));
	
	if(json) {
	    getParam(json.summ, result, 'last_pay', null, null, parseBalance);
	    getParam(json.date, result, 'last_pay_date', null, null, parseDate);
    } else AnyBalance.trace('Не удалось найти информацио по последнему платежу');

	AnyBalance.setResult(result);
}

function parseBalanceMy(val) {
	var balance = parseBalance(val + '');
	if(!isset(balance))
		return null;
	
	return -(balance);
}