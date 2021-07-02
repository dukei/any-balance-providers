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
	baseurl = 'https://ukrtelecom.ua/local/components/ebola.entities/payment.form/ajax.php?type=validateInput&lang=ua&',
	prefs.login=prefs.login.replace(/[^\d]/g, '');
	if (prefs.login.length==16) 
		prefs.login='account=' + prefs.login;
	else 
		prefs.login='phone=0'+prefs.login.substr(-9);
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер телефона или номер лицевого счета!');

	var html = AnyBalance.requestGet(baseurl + prefs.login, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var json=getJson(html);
	if (json.result.toString()=='false') throw new AnyBalance.Error('Неверный номер телефона или лицевого счета');
	var result = {success: true};

	getParam(json.result, result, 'pay', null, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
}