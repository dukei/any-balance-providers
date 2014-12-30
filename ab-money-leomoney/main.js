/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.1599.69 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = "https://leomoney.com/api/";
	AnyBalance.setDefaultCharset('utf-8');
	
	var enterById = (!isset(prefs.login) && !isset(prefs.password)) && (isset(prefs.deviceUID) && isset(prefs.deviceIMEI));
	
	if(!enterById) {
		checkEmpty(prefs.login, 'Please, enter the phone number in international form, for example, +971552344334');
		checkEmpty(prefs.password, 'Please, enter the password!');
		
		var rePrefixes = /^\+(1|7|44|373|374|375|380|971|992|993|994|996|998)(\d+)$/;
		if (!prefs.login || !rePrefixes.test(prefs.login))
			throw new AnyBalance.Error('Number ' + prefs.login + ' is wrong or has incorect prefix.');
		
		var matches = prefs.login.match(rePrefixes);
		
		if (matches[1] != '7' && matches[1] != '971') 
			throw new AnyBalance.Error('Провайдер пока поддерживает только российские и эмиратские номера. Для поддержки других стран обращайтесь к разработчикам.');
		
		baseurl = baseurl + (matches[1] == '7' ? 'ru' : 'ae') + '/';
	}
	
	try {
		if(!enterById) {
			AnyBalance.trace('Entering by login and password...');
			var html = AnyBalance.requestPost(baseurl + 'GetWalletBalanceByLogin', {
				"Phone":matches[1] + matches[2], 
				"Password":prefs.password,
			}, g_headers);
		} else {
			AnyBalance.trace('Entering by uid and imei...');
			baseurl = 'http://87.249.30.67/api/';
			var html = AnyBalance.requestPost(baseurl + 'ru/GetWalletBalance', {
				'DeviceUID':prefs.deviceUID, 
				'DeviceIMEI':prefs.deviceIMEI,
			}, g_headers);
		}
	} catch(e) {}
	
	var code = AnyBalance.getLastStatusCode();
	if(code > 400) {
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	}

        var json = getJson(html);
	
	if(json.Code) {
		if (json.Details)
			throw new AnyBalance.Error(json.Details, null, /Incorrect wallet data/i.test(json.Details));
		
		throw new AnyBalance.Error(matches[1] == '7' ? 'Не удалось зайти в личный кабинет. Сайт изменен?' : 'Can`t login, is the site changed?');
	}
	
	var result = {success: true};

	if(!prefs.type || prefs.type == 'rur')
		prefs.type = 'rub';
	
	var walletBalance = json.WalletBalances;
	for(var i=0; walletBalance && i<walletBalance.length; ++i){
		var acc = walletBalance[i];
		if(acc.Currency.toUpperCase() == prefs.type.toUpperCase()){
			walletBalance = acc;
			break;
		}
	}
	if(!walletBalance){
		AnyBalance.trace(html);
		throw new AnyBalance.Error(matches[1] == '7' ? 'Не удалось найти данные по счету. Сайт изменен?' : 'Can`t find wallet balance, is the site changed?');
	}

        
	
	if(!enterById) {
		getParam(prefs.login, result, 'phone');
		getParam(prefs.login, result, '__tariff');
	}
	getParam('' + walletBalance.AccountId, result, 'wallet');
	getParam('' + walletBalance.Amount, result, 'balance');
	getParam('' + walletBalance.Currency, result, ['currency', 'balance', 'spent', 'limit']);
	getParam('' + walletBalance.TotalAmount, result, 'spent');
	getParam('' + walletBalance.MonthLimit, result, 'limit');
	
	AnyBalance.setResult(result);
}
