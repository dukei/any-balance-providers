/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json, text/javascript, */*; q=0.01',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.111 Safari/537.36'
};

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://ochkarik.ru/club_card/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.card, 'Введите номер карты!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestGet(baseurl + '?id=' + prefs.card + '&action=check&target=club_card',
		addHeaders({Referer: baseurl, 'X-Requested-With': 'XMLHttpRequest'}));

	var json = getJson(html);

	if(!json.body)
		throw new AnyBalance.Error('Cервер вернул некорректные данные! Попробуйте обновить позже.');

	var result = {success: true};
	getParam(json.body, result, 'balance', /Покупок([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(json.body, result, 'discount', /Размер скидки([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
}
