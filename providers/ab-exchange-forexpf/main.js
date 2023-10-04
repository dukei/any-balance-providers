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

function getCurrent(result, value) {
	const now = Math.floor(+new Date()/1000);

	const vn = value.replace(/\//g, '');
	const text = AnyBalance.requestGet("https://charts.profinance.ru/html/tw/history?symbol=" + value + "&resolution=1&from=" + (now - 3600) + "&to=" + now, addHeaders({Referer: "https://www.profinance.ru/" + vn.toLowerCase()})); 
	const json = JSON.parse(text);

	getParam(json.l[json.l.length-1], result, vn + '_bid');
	getParam(json.h[json.h.length-1], result, vn + '_ask');
}

function main() {
	var baseurl = 'https://www.profinance.ru/chart/usdrub/';
	AnyBalance.setDefaultCharset('utf-8');
	
	var result = {success: true};
	
	getCurrent(result, 'USD/RUB');
	getCurrent(result, 'EUR/RUB');
	AnyBalance.setResult(result);
}