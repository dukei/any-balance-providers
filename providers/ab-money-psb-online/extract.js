/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/plain, */*',
	'Content-Type': 'application/json',
	'Connection': 'keep-alive',
	'User-Agent': 'Dalvik/1.6.0 (Linux; U; Android 4.4.2; sdk Build/KK) Android/3.0.2(302)'
};

var baseurlLogon = 'https://online.payment.ru:9643/psbmob/rest/authenticated/';
var baseurl = 'https://online.payment.ru:9643/psbmob/rest/authorized/';


function apiCall(method, params) {
	var arr = method.split(':');
	var method = arr[0]; // POST, GET
	var dest = arr[1]; // logon
	
	var isLogon = dest == 'logon'
	
	if(method == 'GET') {
		var html = AnyBalance.requestGet(baseurl + dest, g_headers);
	} else {
		var html = AnyBalance.requestPost((isLogon ? baseurlLogon : baseurl) + dest, params || '', g_headers);
	}
	
	try {
		var json = getJson(html);
	} catch(e) {}
	
	// {"logonResponse":{"@code":1,"@codeName":"SUCCEEDED"}}
	if(isLogon) {
		if(!json || json.logonResponse['@code'] != 1) {
			var details = getParam(html, null, null, /Error\s+\d+:([\s\S]*?)$/i, replaceTagsAndSpaces);
			
			throw new AnyBalance.Error('Ошибка вызова API: ' + (details || 'проверьте логин или пароль!'));
		}
	}
	
	// Убрать бы лишний уровень вложения
	for(var k in json) {
		json = json[k];
		break;
	}
	
	return json;
}

function login(prefs, result) {
	checkEmpty(prefs.login, 'Введите логин в интернет-банк!');
	checkEmpty(prefs.password, 'Введите пароль в интернет-банк!');
	
	AnyBalance.setDefaultCharset('utf-8');
	AnyBalance.setAuthentication(prefs.login, prefs.password);
	
	var json = apiCall('POST:logon' , '{"logonRequest":{"@version":"a0.1","@architecture":"armv7l","@deviceId":"1234","@deviceName":"klte","@lang":"ru","@model":"SM-G900F","@osName":"Android","@osVersion":"5.0","@subscriptionId":"1234","@subscriptionType":"android"}}');
	
	return json;
}

function logout() {
	apiCall('GET:logoff');
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Счета
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(result) {
	var json = apiCall('GET:main');
	
	var accounts = json.account;
	
	AnyBalance.trace('Найдено счетов: ' + accounts.length);
	result.accounts = [];
	
	for(var i=0; i < accounts.length; ++i) {
		var account = accounts[i];
		
		var _id = account['@number'];
		var title = account['@number'];
		
		var acc = {__id: _id, __name: title};
		
		if(__shouldProcess('accounts', acc)) {
			processAccount(account, acc);
		}
		
		result.accounts.push(acc);
	}
}

function processAccount(account, result) {
    getParam(account['@balance'] + '', result, 'accounts.balance', null, replaceTagsAndSpaces, parseBalance);
    getParam(account['@plannedBalance'] + '', result, 'accounts.plannedBalance', null, replaceTagsAndSpaces, parseBalance);
    getParam(account['@currency'], result, ['accounts.currency', 'accounts.balance']);
    getParam(account['@status'], result, 'accounts.status');
    getParam(account['@type'], result, 'accounts.type');
    getParam(account['@unreadDocuments'], result, 'accounts.unreadDocuments');
    getParam(account['@unreadOperations'], result, 'accounts.unreadOperations');
	
	if(typeof processAccountTransactions != 'undefined')
		processAccountTransactions(result);
}

// Сортируем от большего к меньшему
function sortByKey(array, key) {
	return array.sort(function(a, b) {
		var x = a[key];	var y = b[key];
		return ((x > y) ? -1 : ((x < y) ? 1 : 0));
	});
}

function getFormattedDate(yearCorr) {
	var dt = new Date();
	
	var day = (dt.getDate() < 10 ? '0' + dt.getDate() : dt.getDate());
	var month = ((dt.getMonth()+1) < 10 ? '0' + (dt.getMonth()+1) : dt.getMonth()+1);
	var year = isset(yearCorr) ? dt.getFullYear() - yearCorr : dt.getFullYear();
	
	return day + '.' + month + '.' + year;
}

function parseBoolean(str) {
	return str === 'true';
}

/** Приводим все к единому виду вместо RuR пишем RUR */
function toUpperCaseMy(str) {
	return html_entity_decode(str + '').toUpperCase();
}