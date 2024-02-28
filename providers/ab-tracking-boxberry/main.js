/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

var g_baseurl = 'https://boxberry.ru/';

function callApi(verb){
	AnyBalance.trace('Запрос: ' + g_baseurl + verb);
	html = AnyBalance.requestGet(g_baseurl + verb, addHeaders({
		Accept: 'application/json, text/plain, */*',
		Referer: g_baseurl
	}));
    if(!html || AnyBalance.getLastStatusCode() >= 500){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}
	var json = getJson(html);
    AnyBalance.trace('Ответ: ' + JSON.stringify(json));
	if(json.errorMessage){
		var error =  json.errorMessage;
		if(error)
			throw new AnyBalance.Error(error, null, /не найден/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
	return json;
}

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите трек-номер отправления!');
	
	var result = {success: true};

	var json = callApi('api/v1/tracking/order/get?searchId=' + prefs.login);
	
	if(json.length == 0)
		throw new AnyBalance.Error('Неизвестный тип почтового отправления, проверьте правильность введенных данных');
	
	var info = json[0];
	
	var infoOrderNum = (info && info.imCode) || '',
	    infoOrderNumBox = (info && info.order_id) || '',
		infoStoreName = (info && info.NameIM) || '???',
		infoWeight = (info && info.Weight) || 0,
		infoToPay = (info && info.sum) || 0,
		infoPointCity = (info && info.point_city) || '???',
		infoPointAddress = (info && info.point_address) || '???',
		infoPointPhone = (info && info.point_phone) || '???',
		infoTrackNum = (info && info.ProgramNumber) || '',
		infoTrackId = (info && info.track_id) || '';

	var json = callApi('api/v1/tracking/status/get?trackId=' + infoTrackId);
	
	var status = json.Statuses[json.Statuses.length-1]; // Статус ищем с конца
	
	var statusDate = (status && status.date_time) || '',
//		statusPlace = (status && status.location) || '',
		statusName = (status && status.name) || '???';
	
	getParam(infoOrderNum, result, 'orderNum');
	getParam(infoOrderNumBox, result, 'orderNumBox');
	getParam(infoTrackNum, result, '__tariff');
    getParam(infoStoreName, result, 'storeName');
    getParam(statusDate, result, 'date', null, [/\(|\)/g, ''], parseDate);
	getParam(infoPointCity, result, 'dest');
	getParam(infoToPay, result, 'toPay');
    getParam(infoPointAddress, result, 'point');
	getParam(infoPointPhone, result, 'phone', null, [/\(|\)/g, ' ']);
    getParam(statusName, result, 'status');
	getParam(infoWeight, result, 'weight');
	
	if(isAvailable('all')) {
		var items = json.Statuses;
		if(items && items.length > 0){
			for(var i=items.length-1; i>=0; i--){
				var item = items[i];
                
				sumParam(item.date_time.replace(/\(|\)/g, '') + ': ' + item.name, result, 'all', null, null, null, create_aggregate_join('.\n '));
			}
		}else{
		    AnyBalance.trace('Не удалось получить информацию по статусам отправления');
	    }
	}
	
	AnyBalance.setResult(result);
}