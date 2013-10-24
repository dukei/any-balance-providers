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
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://stat.achinsk.net/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
		
	var html = AnyBalance.requestGet(baseurl + 'tray/sintinfo.php?uname='+encodeURIComponent(prefs.login)+'&upass=' + encodeURIComponent(prefs.password), g_headers);
	
	if(!/<output>/i.test(html)) {
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};
	getParam(html, result, 'balance', /"balance"[^=]*="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
	if(result.balance)
		result.balance = result.balance.toFixed(2);
		
	getParam(html, result, 'licshet', /"licshet"[^=]*="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
	var block = getParam(html, null, null, /"is_blocked"[^=]*="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
	if(block == 0)
		result.is_blocked = 'Нет';
	else
		result.is_blocked = 'Да';
		
    AnyBalance.setResult(result);
}