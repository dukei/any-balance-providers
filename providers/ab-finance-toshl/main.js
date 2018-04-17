/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
};

var baseurl = 'https://toshl.com/';

function apiCall(action, params) {
	var act = /^(.+?):(.+$)/i.exec(action);
	if(!act)
		throw new AnyBalance.Error('apiCall command malformed!');
	
	var method = act[1];
	var methodApi = act[2];
	
	if(method == 'GET')
		var html = AnyBalance.requestGet(baseurl + methodApi, g_headers);
	else
		var html = AnyBalance.requestPost(baseurl + methodApi, params, addHeaders({Referer: baseurl}));
	
	if(AnyBalance.getLastStatusCode() == 401)
		var json = {error_id: 'err', description: 'Неправильный логин или пароль'};
	else
		var json = getJson(html);
	
	if(json.error_id) {
		var error = json.description;
		if (error)
            throw new AnyBalance.Error(error, null, /Неправильный логин или пароль/i.test(error));
        
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Неизвестная ошибка вызова API. Сайт изменен?');
	}

	return json;
}

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин');
	checkEmpty(prefs.password, 'Введите пароль');
	
	var html = AnyBalance.requestGet(baseurl + 'connect/login/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось подключиться к сайту. Попробуйте обновить данные позже');
	}
	
	var json = apiCall('POST:oauth2/login', {
		email: prefs.login,
		password: prefs.password,
		remember_me: true
	})
	
	// Фиксим куку, которая не ставится сама
	var headers = AnyBalance.getLastResponseHeaders();
	
	for(var i = 0; i < headers.length; i++) {
		var header = headers[i];
		var headerName = header[0];
		var headerValue = header[1];
		
		if(/set-cookie/i.test(headerName)) {
			AnyBalance.trace('Пришел заголовок set-cookie, ставим куку вручную...');
			var name = getParam(headerValue, null, null, /^([^=]+)/i);
			var value = getParam(headerValue, null, null, new RegExp(name + '=([^;]+)', 'i'));
			
			AnyBalance.trace(name + ':' + value);
			
			if(name && value)
				AnyBalance.setCookie('toshl.com', name, value);
		}
	}
	
	html = AnyBalance.requestGet(json.redirect, addHeaders({
		'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
		'Referer': 'https://toshl.com/connect/login/'
	}));
	
	var result = {success: true};

	var today = new Date();

	var json = apiCall('GET:api/me/summary?from='+ today.getFullYear()+'-'+(today.getMonth()+1)+'-01'+'&to='+today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDaysInMonth()+'&per_page=500');
	
	getParam(json.left , result, 'balance');
	getParam(json.incomes ? json.incomes.sum : undefined, result, 'incomes');
	getParam(json.expenses ? json.expenses.sum : undefined, result, 'expenses');
	getParam((json.budget && json.budget.currency && json.budget.currency.code) ? json.budget.currency.code : '', result, ['currency', 'balance', 'incomes', 'expenses']);

	AnyBalance.setResult(result);
}

Date.prototype.getDaysInMonth = function() {
	return (new Date(this.getFullYear(), this.getMonth() + 1, 0)).getDate();
};
