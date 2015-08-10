/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'application/json, text/javascript, */*',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.62 Safari/537.36',
	'X-Requested-With':'XMLHttpRequest',
	'Origin':'https://reservations.airarabia.com',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://reservations.airarabia.com/';
    AnyBalance.setDefaultCharset('utf-8');
	// Ставит куку какую-то
	var html = AnyBalance.requestGet('http://www.airarabia.com/home', g_headers);
	// Только после этого доступен переход сюда
    html = AnyBalance.requestGet(baseurl + 'ibe/public/showReservation.action?hdnParamData=RU'+encodeURIComponent('^')+'SI&hdnCarrier=', addHeaders({Referer: baseurl + 'http://www.airarabia.com/home'}));
	// Создаем параметры
	var params = createFormParams(html, function(params, str, name, value) {
		if(name == 'emailId')
			return prefs.login;
		else if(name == 'password')
			return prefs.password.substring(0,12);
		return value;
	});
	// Пробуем войти
	html = AnyBalance.requestPost(baseurl + 'ibe/public/customerLogin.action', params, addHeaders({Referer: baseurl + 'ibe/public/showReservation.action?hdnParamData=RU^SI&hdnCarrier='})); 
	try {
		var json = getJson(html);
	} catch(e) {
		throw new AnyBalance.Error('Error in JSON, please, contact to developers.');
	}
	
	if(json.messageTxt) {
        var error = json.messageTxt;
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Can`t login to selfcare. Site changed?');
    }
	//html = AnyBalance.requestPost(baseurl + 'ibe/public/showCustomerLoadPage!loadCustomerHomePage.action', params, addHeaders({Referer: baseurl + 'ibe/public/showReservation.action?hdnParamData=RU^SI&hdnCarrier='}));
	html = AnyBalance.requestGet(baseurl + 'ibe/public/showCustomerHomeDetail.action', g_headers);
	try {
		json = getJson(html);
	} catch(e) {
		throw new AnyBalance.Error('Error in JSON2, please, contact to developers.');
	}

    var result = {success: true};
	getParam(json.customer.firstName+' ' + json.customer.lastName, result, 'fio', null, replaceTagsAndSpaces);
	if(result.fio)
		result.__tariff = result.fio;

	getParam(json.totalCustomerCredit+'', result, 'balance', null, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}