/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
    var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

    var baseurlLogin = 'https://auth.jino.ru/';
	var baseurl = 'https://cp-hosting.jino.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 
	
	if(!prefs.dbg) {
		var html = AnyBalance.requestGet(baseurl, g_headers);
		
		var params = createFormParams(html, function(params, str, name, value) {
			if (name == 'login') 
				return prefs.login;
			else if (name == 'password')
				return prefs.password;
			
			return value;
		});
		
		html = AnyBalance.requestPost(baseurlLogin + 'login/hosting/', params, addHeaders({Referer: baseurlLogin + 'login/hosting/'})); 		
		
		if(!/\/logout/i.test(html)){
			var error = sumParam(html, null, null, /"form-errors"[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
			if(error)
				throw new AnyBalance.Error(error);
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
	} else {
		var html = AnyBalance.requestGet(baseurl, g_headers);
	}
	
    var result = {success: true};
	
	if(isAvailable('deadline', 'balance', 'daily_fee', 'monthly_fee', 'state')) {
		var json = {};
		try {
			html = AnyBalance.requestGet(baseurl+'balance/', g_headers);
			json = getJson(html);
		} catch(e){
			AnyBalance.trace('Error while getting JSON!');
			AnyBalance.trace(html);
		}
		if(json.status == 'success') {
			getParam(json.data.funds+'', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
			getParam(json.data.payment_by_month+'', result, 'monthly_fee', null, replaceTagsAndSpaces, parseBalance);
			getParam(json.data.payment_by_day+'', result, 'daily_fee', null, replaceTagsAndSpaces, parseBalance);
			getParam(json.data.expiration_date+'', result, 'deadline', null, replaceTagsAndSpaces, parseDateISO);
			getParam(json.data.state+'', result, 'state');
		} else {
			throw new AnyBalance.Error('Сервре вернул ошибочные данные, сайт изменился?');
		}
	}
	// Статистика
	html = AnyBalance.requestGet(baseurl + 'statistics/resources/');
	// Дисковое простанство
	getService(html, result, 'storage', 'Дисковое пространство');
	// Почтовый сервис
	getService(html, result, 'mail', 'Место под Почту');
	// Имя пользователя
	getParam(html, result, '__tariff', /\.login\s*=\s*'([^']+)/i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}

function getService(html, result, counterPrefix, regExpPrefix) {
	if(isAvailable([counterPrefix+'_percent',counterPrefix+'_used', counterPrefix+'_percent_left', counterPrefix+'_total', counterPrefix+'_left'])) {

		var ptc = getParam(html, null, null, new RegExp(regExpPrefix+'[\\s\\S]*?quantitative-graph[^>]*title="([^"]*)','i'), replaceTagsAndSpaces, parseBalance);
		if(isset(ptc)){
			getParam(ptc, result, counterPrefix+'_percent');
			getParam(100-ptc, result, counterPrefix+'_percent_left');
		}
		//Дисковое пространство(?:[^>]*>){9}([\s\d,.]+(?:М|M)Б|B)
		getParam(html, result, counterPrefix+'_total', new RegExp(regExpPrefix+'(?:[^>]*>){9}[\\s\\d,.]+(?:М|M|Г|G)(?:Б|B)\\s*из([\\s\\d,.]+(?:М|M|Г|G)(?:Б|B))','i'), replaceTagsAndSpaces, parseTraffic);
		getParam(html, result, counterPrefix+'_used', new RegExp(regExpPrefix+'(?:[^>]*>){9}([\\s\\d,.]+(?:М|M|Г|G)(?:Б|B))','i'), replaceTagsAndSpaces, parseTraffic);
		
		if(isset(result[counterPrefix+'_total']) && isset(result[counterPrefix+'_used'])) {
			getParam(result[counterPrefix+'_total'] - result[counterPrefix+'_used'], result, counterPrefix+'_left');
		}
	}
}