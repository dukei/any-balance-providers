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
	var baseurl = 'http://xn--1-dtbchwc4a2h.xn--p1ai/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер карты!');
	
	var html = AnyBalance.requestGet(baseurl + 'pivo-ryba-so-skidkoi/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var res = AnyBalance.requestPost(baseurl + 'json/', {
		_do: 'get_card_info',
		card_id: prefs.login
	}, addHeaders({
		Referer: baseurl + 'pivo-ryba-so-skidkoi/',
		'X-Requested-With': 'XMLHttpRequest',
		Accept: 'application/json, text/javascript, */*; q=0.01'
	}));

	if(!res)
		throw new AnyBalance.Error('Неизвестная ошибка. Обратитесь к разработчиркам.');

	var json = getJson(res);

	if(json.error === 1)
		throw new AnyBalance.Error('Информация по указанной карте не найдена.', null, true);		
	
	var result = {success: true};
	
	getParam(json.bonus, result, 'bonus', null, null, parseBalance);
	getParam(json.summ, result, 'summ', null, null, parseBalance);
	
	AnyBalance.setResult(result);
}