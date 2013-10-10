 /** 
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Enter login or SIP ID', true);
	checkEmpty(prefs.password, 'Enter password', true);
    
	AnyBalance.setAuthentication(prefs.login, prefs.password);
	
	var info = AnyBalance.requestGet('https://customer.voipexchange.ru/cgi-bin/Exchange.dll/MTK?oper=3&uid=' + prefs.login);
	
	if(!/Информация о клиенте/i.test(info))
		throw new AnyBalance.Error('Can\'t login. Check login and password');
		
	var result = {success: true};
	
	getParam(info, result, '__tariff', /<td>Тарифный план<\/td><td>(.*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(info, result, 'sipid', /SIP ID<\/td><td><b>(\d*?)<\/b>/i, null, null);
	getParam(info, result, 'login', /Логин<\/td><td><b>(.*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(info, result, 'balance', /\[Balance\](.*?)\[\/Balance\]/i, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}