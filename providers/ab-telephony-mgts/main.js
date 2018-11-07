/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36',
};

function main() {
	AnyBalance.setDefaultCharset("utf-8");
	var baseurl = "https://login.mgts.ru/amserver/UI/Login";
	var prefs = AnyBalance.getPreferences();
	
	var result = {success: true};
	
	if(!prefs.password) {
		var html = AnyBalance.requestGet('https://1.elecsnet.ru/NotebookFront/services/0mhp/default.aspx?merchantId=92', g_headers);

		html = AnyBalance.requestPost('https://1.elecsnet.ru/NotebookFront/services/0mhp/GetMerchantInfo', {
		    merchantId:	'92',
			paymentTool: '9',
			'merchantFields[1]': prefs.login,
			'merchantFields[2]': prefs.kvart || 13,
		}, addHeaders({Referer: AnyBalance.getLastUrl(), 'X-Requested-With': 'XMLHttpRequest' }));
		
		var json = getJson(html);
		if(!json.isSuccess){
			var error = json.message;
			if(/телефонному номеру невозможно/i.test(error))
				throw new AnyBalance.Error('Телефонный номер не существует', null, true);
			if(error)
				throw new AnyBalance.Error(error);
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось получить баланс. Cайт изменен?');
		}

		//Формат ответа: лицевой счет - Название оператора - № транзакции в системе поставщика - Баланс ЛС
		AnyBalance.trace('Ответ от внешней системы: ' + json.message);

		if(/Баланс не может быть получен/i.test(json.message))
			throw new AnyBalance.Error('Баланс временно недоступен. Попробуйте позднее или воспользуйтесь получением баланса по логину и паролю.');

		getParam(json.message, result, 'balance', /Баланс:([^<]*)/i, null, parseBalance);
		getParam(prefs.login, result, 'phone');

	} else {
		AnyBalance.trace('Входим по логину и паролю...');
		
		checkEmpty(prefs.login, 'Введите логин!');
		checkEmpty(prefs.password, 'Введите пароль!');
	
		if(prefs.__dbg) {
			var html = AnyBalance.requestGet('https://lk.mgts.ru/', g_headers);
		} else {
			var html = AnyBalance.requestGet(baseurl, g_headers);
			
			var pin = prefs.password; //.substr(0, 8); //Слишком длинные пины тупо не воспринимаются
			var params = createFormParams(html, function(params, str, name, value) {
				if (name == 'IDToken1') 
					return prefs.login;
				if (name == 'IDToken2') 
					return pin;
				return value;
			});
			html = AnyBalance.requestPost(baseurl, params, addHeaders({Referer: 'https://login.mgts.ru/amserver/UI/Login'}));		
		}
		
		if (!/logout/i.test(html)) {
			var error = sumParam(html, null, null, /"auth-error-text"[^>]*>([^<]+)<\//ig, replaceTagsAndSpaces).join(', ');
			if (error)
				throw new AnyBalance.Error(error, null, /неверный номер телефона/i.test(error));
			
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
		
		getParam(getElement(html, /<div[^>]+account-info_header[^>]*>/i), result, 'fio', null, replaceTagsAndSpaces);
		getParam(html, result, 'balance', /<div[^>]+account-info_balance_value[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'phone', /Номер телефона:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		getParam(html, result, 'licschet', /Лицевой счет:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);

		var json = getJsonObject(html, /mgts.data.widgets\s*=\s*/);
		for(var i=0; json && i<json.length; ++i){
			if(json[i].value)
				sumParam(json[i].value, result, '__tariff', null, replaceTagsAndSpaces, null, aggregate_join);
		}

		var services = getParam(html, null, null, /mgts.data.widget\s*=\s*(\[[\s\S]*?\]);/, null, getJson);
		if(services){
			//Сложим в tariffs все опции, у которых есть value
			var tariffs = services.reduce(function(arr, cur){
				if(cur.value)
					arr.push(replaceAll(cur.value, replaceTagsAndSpaces));
				return arr;
			}, []);
			getParam(tariffs.join(', '), result, '__tariff');
		}

		if(AnyBalance.isAvailable('bonus')){
			html = AnyBalance.requestGet('https://lk.mgts.ru/bonus/', g_headers);
			var info = getJsonObject(html, /mgts.data.bonusInfo/) || {};
			getParam(info.Rest, result, 'bonus');
		}
	}
	
	AnyBalance.setResult(result);
}