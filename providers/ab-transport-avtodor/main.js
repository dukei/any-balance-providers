/**
Компания Автодор, занимающаяся оплату за проезд по платным дорогам (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'Origin': 'https://avtodor-ts.ru',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    AnyBalance.setDefaultCharset('utf-8');
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://lk.avtodor-tr.ru/';

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var form = getElement(html, /<form[^>]+kc-form-login/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа. Сайт изменен?');
	}

	var referer = AnyBalance.getLastUrl();
	var action = getParam(form, /<form[^>]+action="([^"]*)/, replaceHtmlEntities);
	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'username') {
			return prefs.login;
		} else if (name == 'password') {
			return prefs.password;
		}

		return value;
	});
	
    html = AnyBalance.requestPost(joinUrl(referer, action), params, addHeaders({Referer: referer}));

    if(!/\/account\//i.test(AnyBalance.getLastUrl())){
        var error = getElement(html, /<[^>]+alert-error/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	var client = getJson(AnyBalance.requestGet(baseurl + 'api/client/extended', addHeaders({Referer: baseurl})));
	var whoami = getJson(AnyBalance.requestGet(baseurl + 'api/whoami', addHeaders({Referer: baseurl})));

	if(!client.contracts || !client.contracts.length)
		throw new AnyBalance.Error('У вас нет лицевого счета');
	var contract = client.contracts[0];

	AB.getParam(contract.account_balance, result, 'balance');
	AB.getParam(contract.loyalty_member_balance, result, 'bonus');
	AB.getParam(client.client.name, result, 'fio');
	AB.getParam(whoami.user.phone, result, 'phone');
	AB.getParam(whoami.user.email, result, 'email');
	AB.getParam(contract.contract_status_id, result, 'status');
	
    AnyBalance.setResult(result);
}
