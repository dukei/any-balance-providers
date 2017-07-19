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
	
	if(prefs.kvart && !prefs.password) {
		AnyBalance.trace('Получаем информацию по номеру телефона и номеру квартиры...');
		if(!/^\d{10}$/i.test(prefs.login)) {
			throw new AnyBalance.Error('Необходим ввести номер телефона в десятизначном формате, например 4951234567');
		}

		//Зачем мешать полезным роботам информацию получать? Зачем такие сложности? Хватит, а?
		AnyBalance.setCookie('oplata.uralsib.ru', 'PUBLIC_WWV_CUSTOM-F_147019715977769365_30', '1519690862229901');
		AnyBalance.setCookie('oplata.uralsib.ru', 'REMEMBER_WWV', 'PCEsFm3jv59CdRtsUG%2BpQU5l26WdRHLMTL0ZQIyqCXY%3D_510271256');
		AnyBalance.setCookie('oplata.uralsib.ru', 'WWV_CUSTOM-F_147019715977769365_30', '2942459402C78EB6389C26BFA8CDF2FE');
		AnyBalance.setCookie('oplata.uralsib.ru', 'TS019fd881_30', '01403d4e06305cbad863e9a01c436ddb1deafaae94737cbbb4085fa6eb9e4e74233ca61eae3c5777ec5d03e538107c27179d74175e');
		AnyBalance.setCookie('oplata.uralsib.ru', 'TS019fd881_1', '01403d4e065396f9cd674cfdf8de018aa59731aec79c654a965916554743cf96076517a76a15771b515163cd793025eb14acaaa038');
		AnyBalance.setCookie('oplata.uralsib.ru', 'TS019fd881', '0118f3d0af8e6671c5048e9a90c55f43615fb2490b388c1949ca9c89f56bedbc289d8112bcc33212b483a9cdbe99b8dcd7e3b38ec6c128af371739d267732a51b3c00ceae58534334c4921c5dcf22eb62af9ebfedf63dff4a2abaceebc9163037a28ede07b');

		var url = 'https://oplata.uralsib.ru/f?p=30:50:1519690862229901::NO::F30_SERVICE_ID,F30_RESET_SERVICE:442,Y';
		var html = AnyBalance.requestGet(url, g_headers);

		var rsa_E = getParam(html, /window\.rsa_E\s*=\s*"([^"]*)/);
		var rsa_N = getParam(html, /window\.rsa_N\s*=\s*"([^"]*)/);
		var form = getElement(html, /<form[^>]+wwvFlowForm/i);
		if(!form || !rsa_E || !rsa_N){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось получить форму ввода данных');
		}

		var params = createFormParams(form);

		var rsa = new RSAKey();
		rsa.setPublic(rsa_E, rsa_N);

		params.PAYER_FLAT1 = prefs.kvart;
		params.PHONE_NUMBER = prefs.login;

		delete params.P60_CVV;
		params.P60_PAN = rsa.encrypt('4111 1111 1111 1111');
		params.P60_EXPIRE = rsa.encrypt('10/21');
		params.P60_CVC = rsa.encrypt('123');

		html = AnyBalance.requestPost('https://oplata.uralsib.ru/wwv_flow.show', {
			p_request: 'APPLICATION_PROCESS=SAVEPAYMENT',
			p_flow_id: params.p_flow_id,
			p_flow_step_id: params.p_flow_step_id,
			p_instance: params.p_instance,
			x01: createUrlEncodedParams(params),
			x02: '' 
		}, addHeaders({Referer: AnyBalance.getLastUrl() }));
		
		var value = getParam(html, null, null, /value="([^"]+)"[^>]*id="EXTERNAL_RESPONSE"/i, replaceHtmlEntities);
		if(!value){
			var error = getElement(html, /<error/i, replaceTagsAndSpaces);
			if(error)
				throw new AnyBalance.Error(error, null, /Номер не существует/i.test(error));
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось получить баланс. Cайт изменен?');
		}

		//Формат ответа: лицевой счет - Название оператора - № транзакции в системе поставщика - Баланс ЛС
		AnyBalance.trace('Ответ от внешней системы: ' + value);

		if(/Баланс_не_может_быть_получен/i.test(value))
			throw new AnyBalance.Error('Баланс временно недоступен. Попробуйте позднее или воспользуйтесь получением баланса по логину и паролю.');

		getParam(value, result, 'balance', /МГТС-\d+-(.*)$/i, [/=/, '-'], parseBalance);
		getParam(prefs.login, result, 'phone');
		getParam(value, result, 'licschet', /^(\d+)/i);

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
				sumParam(json[i].value, result, '__tariff', null, null, null, aggregate_join);
		}

		var services = getParam(html, null, null, /mgts.data.widget\s*=\s*(\[[\s\S]*?\]);/, null, getJson);
		if(services){
			//Сложим в tariffs все опции, у которых есть value
			var tariffs = services.reduce(function(arr, cur){
				if(cur.value)
					arr.push(cur.value);
				return arr;
			}, []);
			getParam(tariffs.join(', '), result, '__tariff');
		}

		if(AnyBalance.isAvailable('bonus')){
			html = AnyBalance.requestGet('https://bonus.mgts.ru/', g_headers);
			getParam(html, result, 'bonus', /<span[^>]+bonus-number[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
		}
	}
	
	AnyBalance.setResult(result);
}