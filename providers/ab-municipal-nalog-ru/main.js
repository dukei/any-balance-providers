/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language':	'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':		'keep-alive',
	'User-Agent':		'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://lkfl2.nalog.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'lkfl/login', g_headers);
	if(!html || AnyBalance.getLastStatusCode() > 400) {
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = requestPostMultipart(baseurl + 'auth/oauth/token', [
		['username', prefs.login],
		['password', prefs.password],
		['grant_type',	'password'],
		['client_id', 'taxpayer-browser'],
		['client_secret', '7VIPKnZAtwQL7fmtvu2rnAHT6c34DkkG']
	], addHeaders({
		Accept: 'application/json, text/plain, */*',
		Referer: baseurl + 'lkfl/login',
		'Origin': baseurl
	}));

	var json = getJson(html);
	var token = json.access_token;

    if(!token){
		var error = json.error_description;
		if(error) {
			throw new AnyBalance.Error(error, null, /bad credentials/i.test(error));
		}

		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Проверьте правильность ввода логина или пароля. Также возможно, что сайт изменен.');
    }
	var result = {success: true};

	result.__tariff = prefs.login;
	
	if(AnyBalance.isAvailable('fio', 'appears')){
		html = AnyBalance.requestGet(baseurl + 'lkfl/api/v1/taxpayer/taxInfo', addHeaders({
			Referer: baseurl + 'lkfl/',
			Authorization: 'Bearer ' + token
		}));
        
		json = getJson(html);
		getParam(json.name, result, 'fio');
		getParam(json.sumToPay, result, 'arrears');
	}

	if(AnyBalance.isAvailable('overpay')){
		html = AnyBalance.requestGet(baseurl + 'lkfl/api/v1/taxpayer/overpayments', addHeaders({
			Referer: baseurl + 'lkfl/',
			Authorization: 'Bearer ' + token
		}));
        
		json = getJson(html);

		var over = (json || []).reduce(function(acc, cur){ acc += cur.classifiedOverpaymentTotal; return acc }, 0);
		getParam(over, result, 'overpay');
	}
	
    AnyBalance.setResult(result);
}
