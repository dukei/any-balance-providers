/*
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Enter login or SIP ID');
	checkEmpty(prefs.password, 'Enter password');

	AnyBalance.setAuthentication(prefs.login, prefs.password);

	var info = AnyBalance.requestGet('https://customer.voipexchange.ru/cgi-bin/Exchange.dll/MTK?oper=3&uid=' + encodeURIComponent(prefs.login));

	if(!/Информация о клиенте/i.test(info))
		throw new AnyBalance.Error('Can`t login. Check login and password');

	var result = {success: true};
	getParam(info, result, '__tariff', /Тарифный план(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(info, result, 'sipid', /SIP ID(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(info, result, 'login', /Логин(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(info, result, 'balance_precise', /Остаток(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	if(AnyBalance.isAvailable('balance'))
		result['balance'] = result['balance_precise'].toFixed(2);

	AnyBalance.setResult(result);
}
