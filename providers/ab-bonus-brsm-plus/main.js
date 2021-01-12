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
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://brsm-plus.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	html = AnyBalance.requestPost(baseurl + 'ua/login', {
		num_cart: prefs.login,
		password: prefs.password
	});
	if (html != '{"success":true}') {
		var error = getJson(html).error;
		if (error)
			throw new AnyBalance.Error(error, null, /Стoрiнка тимчасoвo недoступна/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

//	var html = AnyBalance.requestGet(baseurl + 'ua/api2/mobile/get_economy_data', g_headers);
	var html = AnyBalance.requestGet(baseurl + 'ua/api2/mobile/get_user_data', g_headers);
	var json=getJson(html);
	var result = {success: true};
	if  (json.Result=='SUCCESS'){
		getParam(json.Data.curr_points, result, 'balance');
		getParam(json.Data.prev_points, result, 'prev_points');
	}else{
         	if (json.Data.message) {throw new AnyBalance.Error(json.Data.message)} else {throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?')};
	}


	var html = AnyBalance.requestGet(baseurl + 'ua/api2/mobile/get_economy_data', g_headers);
	var json=getJson(html);
	if  (json.Result=='SUCCESS'){
                for (var c in json.Data)  result[c]=json.Data[c];
	}

	//var discNext = getElement(html, /<div class="disc_next">/i);
	
	
	AnyBalance.setResult(result);
}