/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Провайдер партнерской программы Landora Investing LTD
Сайт: http://www.landora-investing.com/
mailto:wtiger@mail.ru
*/


function main(){
	var prefs = AnyBalance.getPreferences();

//разлогиниться из кабинета 
//	var outinfo = AnyBalance.requestPost(baseurl + "cab.php", {
//		"logout": "1"
//	});

	var baseurl = 'https://landora-investing.com/';
	AnyBalance.setDefaultCharset('utf-8');

	AnyBalance.trace('Authorizing...');
	var info = AnyBalance.requestPost(baseurl + "ru/login", {
		"Login": prefs.Login,
		"Pswd": prefs.Pswd
	});

	var error = $('#errHolder', info).text();
	if(error){
		throw new AnyBalance.Error(error);
	}

	var result = {success: true};

	if(matches = info.match(/Неверный пароль/i)){
		throw new AnyBalance.Error("Неверный пароль.");}


	var info = AnyBalance.requestGet(baseurl + "ru/cabinet/account");

	AnyBalance.trace('Parsing... ');

	getParam(info, result, '__tariff', /<div class="deposit-label">План:<\/div>\s+<div class="deposit-value">(.*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(info, result, 'cource_dollar', /USD:<\/div><\/td><td>(.*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'cource_euro', /EUR:<\/div><\/td><td>(.*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'deposit', /<div class="deposit-label">Текущий депозит:<\/div>\s+<div class="deposit-value text-red">(.*?)\$<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'balance', /<div class="deposit-label">Текущий баланс:<\/div>\s+<div class="deposit-value text-green">(.*?)\$<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'referral', /<div class="deposit-label">Реф. начисления<\/div>\s+<div class="deposit-value text-green">(.*?)\$<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'profit', /<div class="deposit-label">Доходность .*?<\/div>\s+<div .*?>(.*?)\%<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'total', /<td>Всего инвестировано: <strong>\$(.*?)<\/strong>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'stocking', /<td>Всего начислено: <strong>\$(.*?)<\/strong>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'withdrawal', /<td>Всего выведено: <strong>\$(.*?)<\/strong>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'date_penalty', /Дата вывода без штрафа не ранее <strong>(.*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);

//	var outinfo = AnyBalance.requestPost(baseurl + "cab.php", {
//		"logout": "1"
//	});

	AnyBalance.setResult(result);
};

