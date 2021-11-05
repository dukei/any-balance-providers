/**
Провайдер AnyBalance (https://github.com/dukei/any-balance-providers)
*/

var g_headers = {
	'Accept': 'application/json, text/plain, */*',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7,fy;q=0.6',
	'Connection': 'keep-alive',
	'Content-Type': 'application/json',
	'AppKey': 'ztn0Nb8MstUVBiQcLPvi',
	'Deviceinfo': '/WEB/Chrome/WindowsNT 10.010/77.0.3865.120/d5c910f0e006f38522049c2b50f796c9',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36'
};

var baseurl = 'https://my.ufanet.ru/api/v0/';

function main() {
	var prefs = AnyBalance.getPreferences();

	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet('https://my.vltele.com/login', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}
	
	var json = apiCall('token/', {
		login: prefs.login,
		password: prefs.password
	});

	var token = json.detail.access

	if (!token) {
		var error = AB.getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	g_headers = addHeaders({Authorization: 'JWT ' + token});
	
	var contract = findFirstActiveContract()
	
	if(!contract) {
		throw new AnyBalance.Error('Не удалось найти ни одного договора');
	}

    var result = { success: true };

    getContractInfo(result, contract.contract_id)
	
	AnyBalance.setResult(result);
}

function getContractInfo(result, contract_id) {

	var json = apiCall('contract_info/get_contract_info/', {
	    contracts:[{"contract_id":contract_id,"billing_id":"rb"}]
    })

	var contractDetails = json.detail.find(function findByContractId(element, index, array) { return element.contract_id == contract_id })

	if(!contractDetails) {
		throw new AnyBalance.Error('Не удалось получить данные по контракту');
	}
	
    AB.getParam(contractDetails.balance.current, result, 'balance');
	AB.getParam('р', result, ['currency', 'balance']);
	AB.getParam(contractDetails.customer_name, result, 'fio');
	AB.getParam(contractDetails.contract_title, result, '__tariff');
	AB.getParam(contractDetails.contract_status, result, 'status');
	AB.getParam(contractDetails.services[0].period_end * 1000, result, 'deadline');
}

function apiCall(location, params) {
	var html
	if(!params) {
		html = AnyBalance.requestGet(baseurl + location, g_headers);
	} else { 
		html = AnyBalance.requestPost(baseurl + location, JSON.stringify(params), g_headers);
	}

	var json = getJson(html);
	if(!json) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось вызвать функцию ' + location);
	}
	
	AnyBalance.trace('Got api response: ' + JSON.stringify(json));
	
	if(json.status_id > 299) {
		throw new AnyBalance.Error('Не удалось вызвать функцию ' + location + ', код: ' + json.status_id);
	}
	
	return json
}

function findFirstActiveContract() {
	var json = apiCall('contract_info/get_all_contract/')
	
	return json.detail.contracts[0]	
}
