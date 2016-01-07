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
		AnyBalance.setCookie('oplata.uralsibbank.ru', 'TS01db9e9f_28', '01403d4e06e38d0fe057dcb52f2ee998045c5396b2116a12967573f07ea9a826266a4178a5a6bf05c506e30553bcda3b982d78da99');
		AnyBalance.setCookie('oplata.uralsibbank.ru', 'TS01db9e9f', '0118f3d0afce1b9fbaa1479f5755548421a93d22c2452c40b56a563845e933970eefb43c09298850ca6a705c943fc03947af962d76a57794fedbffa1442294a7e57125fead5d5f5896aa0e912baf522b42a6edb18f');
		var serviceID = '442', csrt = '13775051121879390047';

		var url = 'https://oplata.uralsibbank.ru/cityp_eorder.asp?ServiceID=' + serviceID + '&csrt=' + csrt;
		var html = AnyBalance.requestGet(url, g_headers);
		
		html = AnyBalance.requestPost(url, {
			extents: 'payment_id="" service_id="'+serviceID+'" customer_id="0" contract_id="0" cliring="MKC" needaddinfo="" PHONE_NUMBER="'+prefs.login+'" PAYER_FLAT1="'+prefs.kvart+'" EXTERNAL_RESPONSE="" main_amount="10.00" PURPOSE_PAYMENT="" action="save"',
			action: 'save'
		}, addHeaders({Referer: url }));
		
		getParam(html, result, 'balance', /id="EXTERNAL_RESPONSE"[^>]*value="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
		if(!isset(result.balance)) {
			throw new AnyBalance.Error('Неизвестная ошибка получения баланса, свяжитесь с разработчиком и проверьте номер телефона и номер квартиры.');
		}		
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
		
		getParam(html, result, 'fio', /<div[^>]+account-info_header[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		getParam(html, result, 'balance', /<div[^>]+account-info_balance_value[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'phone', /Номер телефона:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		getParam(html, result, 'licschet', /Лицевой счет:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);

		var services = getJsonObject(html, /mgts.data.widgets =/, '[');
		if(services){
			//Сложим в tariffs все опции, у которых есть value
			var tariffs = services.reduce(function(arr, cur){
				if(cur.value)
					arr.push(cur.value);
				return arr;
			}, []);
			getParam(tariffs.join(', '), result, '__tariff');
		}
	}
	
	AnyBalance.setResult(result);
}