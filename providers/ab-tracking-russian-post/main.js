/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.7,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.code, 'Введите код отправления!');
	
	mainRussianPost();
}

function mainRussianPost() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	AnyBalance.trace('Connecting to russianpost...');
	var baseurl = 'https://www.pochta.ru/';
	
	var info = AnyBalance.requestGet(baseurl + 'tracking', g_headers);
	
	info = AnyBalance.requestPost(baseurl + 'api/nano-apps/api/v1/tracking.get-by-barcodes?language=ru', JSON.stringify([prefs.code]), addHeaders({
		'Accept': 'application/json',
		'Content-Type': 'application/json',
		'Referer': baseurl + 'tracking'
	}));
	
	var result = {success: true};
	
	result.__tariff = prefs.code;
	
	var json = getJson(info);
	AnyBalance.trace('Info: ' + JSON.stringify(json));
	
	if(!json.detailedTrackings || !json.detailedTrackings[0]){
		var error = json.error && json.error.description;
		if(error)
			throw new AnyBalance.Error(error, null, /barcode/i.test(error));
		AnyBalance.trace(info);
		throw new AnyBalance.Error('Информация о почтовом отправлении не найдена! Проверьте правильность ввода трек-номера: ' + prefs.code);
	}

    var jsonInfo = json.detailedTrackings[0];
	getParam(jsonInfo.trackingItem.weight+'', result, 'weight', null, replaceTagsAndSpaces, parseBalance);
	getParam(jsonInfo.trackingItem.sender+'', result, 'sender', null, replaceTagsAndSpaces);
	getParam(jsonInfo.trackingItem.recipient+'', result, 'recipient', null, replaceTagsAndSpaces);
	getParam(jsonInfo.trackingItem.destinationCityName+'', result, 'to', null, replaceTagsAndSpaces);
	

	if(!jsonInfo.trackingItem || !jsonInfo.trackingItem.trackingHistoryItemList)
		throw new AnyBalance.Error('Нет информации о прохождении посылки! Возможно, она появится позже.');
	
	var op = jsonInfo.trackingItem.trackingHistoryItemList[0];
	
	getParam(op.date+'', result, ['date', 'fulltext'], null, replaceTagsAndSpaces, parseDateISO);
	getParam(op.date+'', result, ['time', 'fulltext'], null, replaceTagsAndSpaces, parseDateISO);
	getParam(op.humanStatus, result, ['operation', 'fulltext']);
	sumParam(op.cityName, result, ['location', 'fulltext'], null, null, null, aggregate_join);
	sumParam(op.countryName, result, ['location', 'fulltext'], null, null, null, aggregate_join);
	sumParam(op.index, result, ['location', 'fulltext'], null, null, null, aggregate_join);
	getParam(op.description, result, ['attribute', 'fulltext']);
	getParam(op.countryCustomName, result, ['operator', 'fulltext']);
//	getParam(op.Payment+'', result, 'addcost', null, replaceTagsAndSpaces, parseBalance);
	getParam('<small>' + getFormattedDate(null, new Date(result.time)) + '</small>: <b>' + result.operation + '</b><br/>' + result.location + '<br/>' + result.attribute + (result.addcost ? ', Н/п ' + result.addcost + 'р' : ''), result, 'fulltext');
	
	AnyBalance.setResult(result);
}