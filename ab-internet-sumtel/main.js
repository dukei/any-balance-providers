/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'*/*',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.66 Safari/537.36',
	'Origin':'http://my.sumtel.ru/'
};

var g_uID = 'AnyBalanceParser';

function main(){
    var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var baseurl = 'http://sbmsapi.sumtel.ru/';
    AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl + 'get_bill_v2.php?l=' + encodeURIComponent(prefs.login) + '&p=' + encodeURIComponent(prefs.password) + '&app=' + g_uID);
	
	if(/error/i.test(html)) {
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Причина: ' + html);
	}
	
	var json = getJson(html);
	
	var result = {success: true};
	
	getParam(json.bill+'', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.ap+'', result, 'abon', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.fio, result, 'fio', null, replaceTagsAndSpaces, html_entity_decode);
	getParam(json.contract, result, 'acc_num', null, replaceTagsAndSpaces, html_entity_decode);
	getParam(json.status, result, 'status', null, replaceTagsAndSpaces, html_entity_decode);		
	//getParam(html, result, '__tariff', /&#1058;&#1077;&#1082;&#1091;&#1097;&#1080;&#1081; &#1090;&#1072;&#1088;&#1080;&#1092;&#1085;&#1099;&#1081; &#1087;&#1083;&#1072;&#1085;:(?:[\s\S]*?<div[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);	
}