/**
Provider of AnyBalance (http://any-balance-providers.googlecode.com)

Provider for FX-Trend
WWW: http://www.fx-trend.com
mailto:wtiger@mail.ru
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

	AnyBalance.trace('Authorizing and trying to get info...');

	var baseurl = 'https://fx-trend.com/';


	var info = AnyBalance.requestPost(baseurl + 'login/my/profile/info', {
		"login": prefs.login,
		"pass": prefs.pass
	}, addHeaders({Referer: baseurl + 'profile'}));	

	var error = $('#errHolder', info).text();
	if(error){
		throw new AnyBalance.Error(error);
	}

	var result = {success: true};

	AnyBalance.trace('Parsing... ');

	info = AnyBalance.requestGet(baseurl + 'my/accounts/');

	var re = new RegExp('\\{[^\\{\\}]*?"mt_login":\"'+prefs.account+'",.*?\\}', 'i');

	if(matches = info.match(re)){
		var info = matches[0];
		result.__tariff = prefs.account;

		result.open = getParam(info, null, null, /"created_at":"(.*?)"/i, replaceTagsAndSpaces, html_entity_decode);
		result.currency = getParam(info, null, null, /"currency":"(.*?)"/i, replaceTagsAndSpaces, html_entity_decode);
		result.leverage = getParam(info, null, null, /"leverage":"(.*?)"/i, replaceTagsAndSpaces, html_entity_decode);
		result.balance = getParam(info, null, null, /"balance":([\d\.]*)/i, replaceTagsAndSpaces, parseBalance);
		result.equity = getParam(info, null, null, /"equity":([\d\.]*)/i, replaceTagsAndSpaces, parseBalance);
		result.receipts = Math.round((result.equity*1 - result.balance*1)*100)/100;
		result.margin = getParam(info, null, null, /"margin":([\d\.]*)/i, replaceTagsAndSpaces, parseBalance);
		result.free = getParam(info, null, null, /"free":([\d\.]*)/i, replaceTagsAndSpaces, parseBalance);
		result.mlevel = getParam(info, null, null, /"mlevel":([\d\.]*)/i, replaceTagsAndSpaces, parseBalance);
		result.profit = getParam(info, null, null, /"profit":([\d\.]*)/i, replaceTagsAndSpaces, parseBalance);

	}
	else{
		if(matches = info.match(/Извините, доступ в личные кабинеты временно приостановлен в связи с проведением периодического ролловера/i)){
			throw new AnyBalance.Error("Извините, доступ в личные кабинеты временно приостановлен в связи с проведением периодического ролловера.");}
		else{
			throw new AnyBalance.Error("Incorrect number of account or error getting statistics");}
	}

	
	AnyBalance.setResult(result);
};

