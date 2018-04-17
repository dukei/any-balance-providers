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

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://rucaptcha.com';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.key, 'Введите Captcha Key из вкладки API вебмастеру вашего личного кабинета ruCaptcha!');

	var	html = AnyBalance.requestGet(baseurl+'/res.php?key=' + encodeURIComponent(prefs.key) + '&action=getbalance');	

	var result = {success: true};
	getParam(html, result, 'balance', null, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);

}