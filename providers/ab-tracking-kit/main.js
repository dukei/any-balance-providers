/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://tk-kit.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.trackNumber, 'Введите трек номер!');

	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestGet(baseurl+'/rx_check_order_status.php?num='+encodeURIComponent(prefs.trackNumber)+'&_='+new Date().getTime());

	var json = getJson(html);

	if(json.found && json.found.list[0] && json.found.list[0].statuses[0]) {
		if (json.found.list[0].statuses.length==1&&!json.found.list[0].statuses[0].timestamp)
			throw new AnyBalance.Error('Заказ с указанной экспедиторской распиской не найден.', null, true);
	}
	else {
		AnyBalance.trace(html);
		throw new AnyBalance.Error("Не удалось получить информацию. Сайт изменён?")
	}

	var result = {success: true};

	getParam(json.found.list[0].statuses[0].status_text, result, 'operation');
	getParam(json.found.list[0].statuses[0].timestamp, result, 'date');
	AnyBalance.setResult(result);
}