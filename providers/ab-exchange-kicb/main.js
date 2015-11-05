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
	var baseurl = 'http://kicb.net/welcome/';
	AnyBalance.setDefaultCharset('windows-1251');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	var result = {success: true};

	var cash = /USD([\s\S]*?)Безналичный/i.exec(html);
	if(!cash)
		throw new AnyBalance.Error('Не удалось найти таблицу с валютами, сайт изменен?');
	console.log(cash[1]);
	var currencies = cash[1].match(/<span >([\s\S]*?)<img/ig);
	for (var i = 0; i < currencies.length; i++) {
		currencies[i] = currencies[i].replace('data2', '').replace(/[^.\d]/g, '');
	}
	result.cash_usd_buy = currencies[0];
	result.cash_usd_sell = currencies[1];
	result.cash_eur_buy = currencies[2];
	result.cash_eur_sell = currencies[3];
	result.cash_rub_buy = currencies[4];
	result.cash_rub_sell = currencies[5];
	result.cash_kzt_buy = currencies[6];
	result.cash_kzt_sell = currencies[7];

	var cashless = /Безналичный([\s\S]*?)Акции/i.exec(html);
	if(!cashless)
		throw new AnyBalance.Error('Не удалось найти таблицу с валютами, сайт изменен?');

	cashless = /USD([\s\S]*?)Акции/i.exec(cashless[0]);
	currencies = cashless[1].match(/<span >([\s\S]*?)<img/ig);
	for (var i = 0; i < currencies.length; i++) {
		currencies[i] = currencies[i].replace('data2', '').replace(/[^.\d]/g, '');
	}
	result.cashless_usd_buy = currencies[0];
	result.cashless_usd_sell = currencies[1];
	result.cashless_eur_buy = currencies[2];
	result.cashless_eur_sell = currencies[3];
	result.cashless_rub_buy = currencies[4];
	result.cashless_rub_sell = currencies[5];
	result.cashless_kzt_buy = currencies[6];
	result.cashless_kzt_sell = currencies[7];

	AnyBalance.setResult(result);
}