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
	var baseurl = 'https://lka.teletie.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'username') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});

/*	if(!/invisible-captcha/i.test(html)){
		var captchaa;
		AnyBalance.trace('Пытаемся ввести капчу');
		var captchaHref = getParam(html, null, null, /captcha["'][^>]*src=["']\/([^'"]+)/i, replaceTagsAndSpaces);
		
		var captcha = AnyBalance.requestGet(baseurl + captchaHref);
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
		
		params.captcha = captchaa;
	}
*/	
	html = AnyBalance.requestPost(baseurl + 'ajax/auth/', params, addHeaders({
		Referer: baseurl + 'login', 
		'X-Requested-With': 'XMLHttpRequest'
	}));

	var json = getJson(html);
	
	if (!json || json.status != 200) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Номер телефона или пароль указаны неверно', null, true);
	}
	
	var result = {success: true};
	
	html = AnyBalance.requestGet(baseurl + 'ajax/getSummaryFirstContractInfo/0/', addHeaders({
		Referer: baseurl + 'gui', 
		'X-Requested-With': 'XMLHttpRequest'
	}));
  	json = getJson(html);

  	var phone = json.products[0].ident_list_list[0].value;

	getParam(json.balances[0].value, result);
	getParam(phone, result, 'phone');
	getParam(json.base.status_humanize, result, 'status');
	getParam(json.products[0].tplan, result, '__tariff');
	
	html = AnyBalance.requestGet(baseurl + 'ajax/getServicePackage/' + json.base.v_contract + '/', addHeaders({
		Referer: baseurl + 'gui', 
		'X-Requested-With': 'XMLHttpRequest'
	}));
  	json = getJson(html);

  	var rests = json[phone];
  	for(var i in rests){
  		var rest = rests[i];
  		if(i == 'SMS_MMS'){
  			for(var x in rest){
				sumParam(rest[x].n_volume_left, result, 'rest_sms', null, null, null, aggregate_sum);
  			}
  		}else if(i == 'VOICE'){
  			for(var x in rest){
				sumParam(rest[x].n_volume_left, result, 'rest_local', null, null, null, aggregate_sum);
  			}
  		}
  	}

	AnyBalance.setResult(result);
}