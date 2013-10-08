 /** 
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main(){
	var prefs = AnyBalance.getPreferences();
    
	var info = AnyBalance.requestPost('https://customer.sipnet.ru/cabinet/', {
		Name: prefs.login,
		Password: prefs.password,
		CabinetAction: 'login'
	}, g_headers);
	
	if(!/CabinetAction=logout/i.test(info))
		throw new AnyBalance.Error('Can`t login. Site changed?');
	
	var result = {success: true};
	getParam(info, result, 'balance', /На Вашем счете[^>]*>[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, '__tariff', /Ваш SIP ID[^>]*>[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(info, result, 'sipid', /Ваш SIP ID[^>]*>[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}