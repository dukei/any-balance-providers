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

    var html = AnyBalance.requestGet(baseurl + 'ibe/public/showReservation.action?hdnParamData=RU^SI&hdnCarrier=', g_headers);

	var params = createFormParams(html, function(params, str, name, value){
		if(name == 'emailId')
			return prefs.login;
		else if(name == 'password')
			return prefs.password;
		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'ibe/public/customerLogin.action', params, addHeaders({Referer: baseurl + 'ibe/public/showReservation.action?hdnParamData=RU^SI&hdnCarrier='})); 
	
	var json = getJson(html);
	
	if(json.messageTxt != '')
	{
        var error = json.messageTxt;
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	html = AnyBalance.requestPost(baseurl + 'ibe/public/showCustomerLoadPage!loadCustomerHomePage.action', params, addHeaders({Referer: baseurl + 'ibe/public/showReservation.action?hdnParamData=RU^SI&hdnCarrier='}));
	html = AnyBalance.requestGet(baseurl + 'ibe/public/showCustomerHomeDetail.action', g_headers);

	json = getJson(html);

    var result = {success: true};
	result.fio = json.customer.firstName+' ' + json.customer.lastName;
	getParam(json.totalCustomerCredit, result, 'balance', null, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}