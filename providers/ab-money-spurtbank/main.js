/**
Provider of AnyBalance (http://any-balance-providers.googlecode.com)

Provider for Spurtbank
WWW: http://spurtbank.handybank.ru
mailto:wtiger@mail.ru
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'utf-8;q=0.7,*;q=0.3',
//	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Accept-Language': 'en-US;q=0.8,en;q=0.6',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main(){
	var prefs = AnyBalance.getPreferences();

	var baseurl = 'https://spurtbank.handybank.ru/';
	var result;

	AnyBalance.trace('Authorizing and parsing...');

	if(prefs.card == null){
		throw new AnyBalance.Error("Укажите четыре последние цифры карты.");
	}

	var info = AnyBalance.requestPost(baseurl, {
		"action": "auth",
		"login": prefs.login,
		"pass": prefs.pass
	}, addHeaders({Referer: baseurl}));	

	var error = $('#errHolder', info).text();
	if(error){
		throw new AnyBalance.Error(error);
	}

	if(matches = info.match(/<div class="error">(.*?)<\/div>/)){
		throw new AnyBalance.Error(matches[1]);
	}

	result = {success: true};
	var str=new RegExp('[\\s\\S]*(<tr class="account">[\\s\\S]*?карта .*?'+prefs.card+'.*?<\\/tr>)','i');
	if(matches = info.match(str)){
		info1=matches[1];

		getParam(info1, result, 'account', /счет (\d+)/i, replaceTagsAndSpaces, parseBalance);
		getParam(info1, result, 'currency', /счет \d+ \((.*?)\)/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(info1, result, 'balance', /счет \d+.*?<td align="right">(.*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(info1, result, 'balance_rur', /счет .*?<\/td>.*?<\/td>.*?<\/td>.*?<\/td><td align="right">(.*?)<\/td><\/tr>/i, replaceTagsAndSpaces, parseBalance);
		result.__tariff = getParam(info1, null, null, /карта (.*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(info1, result, 'card_expire', /до&nbsp;(.*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

	}
	else{
		throw new AnyBalance.Error("Не найдена информация по карте ***"+prefs.card+".");
	}

	AnyBalance.setResult(result);
};

