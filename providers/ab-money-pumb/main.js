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
	var baseurl = 'https://online.pumb.ua/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'uk/security/logon', g_headers);

	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'login') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'uk/security/logon', params, addHeaders({Referer: baseurl + 'uk/security/logon'}));

	if (!/logout/i.test(html)) {
		var error = getElement(html, /<div[^>]+pageerror/, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	fetchAccount(html, baseurl);
}

function getStateParams(html, param) {
	return getParam(html, null, null, new RegExp(param + '[^>]*value="([^"]+)', 'i'));
}

function fetchAccount(html, baseurl) {
	var prefs = AnyBalance.getPreferences();
	
	html = AnyBalance.requestGet(baseurl + 'uk/accounts/data?nc=' + (+new Date()), addHeaders({
		'X-Requested-With': 'XMLHttpRequest',
		Referer: baseurl
	}));

	var json = getJson(html);

	for(var i=0; i<json.length; ++i){
		var acc = json[i];
		AnyBalance.trace('Найден счет ' + acc.AccountNumber + ': ' + acc.Balance + ' ' + acc.Currency);
		if(!prefs.lastdigits || endsWith(acc.AccountNumber, prefs.lastdigits)){
			var result = {success: true};

			getParam(acc.AccountNumber, result, 'accNum');
			getParam(acc.Balance/100, result, 'balance');
			getParam(acc.Currency, result, ['currency', 'balance']);	
			getParam(acc.AccountName, result, 'fio');

			if(isAvailable(['__tariff', 'till', 'blocked_balance', 'fio'])) {

				html = AnyBalance.requestGet(baseurl + 'uk/accounts/details/data/' + acc.UniqueKey + '?nc=' + (+new Date()), addHeaders({
					'X-Requested-With': 'XMLHttpRequest',
					Referer: baseurl
				}));    	

				json = getJson(html);

				getParam(json.ProductName, result, '__tariff');
				if(json.OverdraftFlag){
					getParam(json.OverdraftData.TillDate, result, 'till', null, null, parseDateISO);
				}
				getParam(json.Holds/100, result, 'blocked_balance');
			}

			
		}
	}

	
	AnyBalance.setResult(result);
}
