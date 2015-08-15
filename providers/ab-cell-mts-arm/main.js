/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://cabinet.mts.am/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'Pages/login.aspx', g_headers);
	
	var found = /(\d{3})(\d{6})/i.exec(prefs.login);
	if(!found)
		throw new AnyBalance.Error('Логин должен быть в формате 094123456, без пробелов');
		
	var prefix = found[1];
	var tel = found[2];

	var HiddenField = 0;
	if(prefix == '077')
		HiddenField = 0;
	else if(prefix == '093')
		HiddenField = 1;
	else if(prefix == '094')
		HiddenField = 2;
	else if(prefix == '098')
		HiddenField = 3;

	var form = getElement(html, /<form[^>]+name="aspnetForm"[^>]*>/i);
	if(!form)
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');

	var params = createFormParams(form, function(params, str, name, value) {
		if (/TextBox/i.test(name)) 
			return prefix;
		if (/GsmNumber/i.test(name)) 
			return tel;
		else if (/Password/i.test(name))
			return prefs.password;
		else if (/HiddenField/i.test(name))
			return HiddenField;
		else if (/MessageBox/i.test(name))
			return;
			

		return value;
	});
	

	html = AnyBalance.requestPost(baseurl + 'Pages/login.aspx', params, g_headers); 
	
	if(!/ctl00_ctl00_ctl00_lnkSignOut/i.test(html)) {
		var error = sumParam(html, null, null, /<span[^>]*message_box_([^>]*>){2}/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
		if (error)
			throw new AnyBalance.Error(error, null, /Incorrect phone number or password/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};
	
    getParam(html, result, '__tariff', /ctl00_ctl00_ctl00_addMenue_lblSubType">([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /ctl00_ctl00_ctl00_addMenue_lblAccount">([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /"ctl00_ctl00_ctl00_addMenue_lblStatus">([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'validto', /"ctl00_ctl00_ctl00_addMenue_lblExpDateInfo">([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
	getParam(prefs.login, result, 'phone', null, null, null);

	if(isAvailable('bonus')) {
		var SubscriberID = getParam(html, null, null, /SubscriberID=([^"]*)/i);
		
		html = AnyBalance.requestPost(baseurl + 'Pages/bonushistory.aspx?SubscriberID='+SubscriberID, '', g_headers);
		html = AnyBalance.requestPost(baseurl + 'Pages/bonushistory.aspx?SubscriberID='+SubscriberID, '', g_headers);
		getParam(html, result, 'bonus', /You have([\s\S]*?)bonus points/i, replaceTagsAndSpaces, parseBalance);
	}
	
    AnyBalance.setResult(result);
}