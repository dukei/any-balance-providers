/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.code, 'Введите код отправления!');
	
	if(!prefs.source)
		prefs.source = 'auto';
	
	switch(prefs.source){
    case 'rp':
        mainRussianPost();
        break;
	case 'mt':
        mainMainTransport();
        break;
    case 'auto':
    default:
        try{
			mainRussianPost();
        }catch(e){
			AnyBalance.trace('Не удалось получить данные с сайта Почты России: ' + e.message);
		    clearAllCookies();
			mainMainTransport();
        }
        break;
	}
}

function mainRussianPost() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	AnyBalance.trace('Пробуем получить данные с сайта Почты России...');
	var baseurl = 'https://www.pochta.ru/';
	
	var info = AnyBalance.requestGet(baseurl + 'tracking', g_headers);
	
	if(!info || AnyBalance.getLastStatusCode() >= 500){
        AnyBalance.trace(info);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
	if(/"csrfTokenEnabled":\s?true/i.test(info)){
	    var csrf = getParam(info, /"csrfToken":"([^"]*)/i, replaceHtmlEntities);
		g_headers['Csrf-Token'] = csrf;
		
		if(!csrf || AnyBalance.getLastStatusCode() == 403){
            AnyBalance.trace(info);
            throw new AnyBalance.Error('Не удалось найти токен авторизации. Сайт изменен?');
        }
	}
	
	info = AnyBalance.requestGet(baseurl + 'api/tracking/api/v1/trackings/by-barcodes?language=ru&track-numbers=' + prefs.code, addHeaders({
		'Accept': 'application/json',
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
	if(!jsonInfo.trackingItem || !jsonInfo.trackingItem.trackingHistoryItemList)
		throw new AnyBalance.Error('Нет информации о прохождении посылки! Возможно, она появится позже.');
	
	var item = jsonInfo.trackingItem;
	
	getParam(item.weight+'', result, 'weight', null, replaceTagsAndSpaces, parseBalance);
	getParam(item.sender+'', result, 'sender', null, replaceTagsAndSpaces);
	getParam(item.recipient+'', result, 'recipient', null, replaceTagsAndSpaces);
	getParam(item.originCityName+'', result, 'from', null, replaceTagsAndSpaces);
	getParam(item.destinationCityName+'', result, 'to', null, replaceTagsAndSpaces);
	getParam(item.mailTypeText+'', result, 'type', null, replaceTagsAndSpaces);
	getParam(item.mailRankText+'', result, 'rank', null, replaceTagsAndSpaces);
	
	if(item.trackingHistoryItemList && item.trackingHistoryItemList[0]){
	    var op = item.trackingHistoryItemList[0];
	    
	    getParam(op.humanStatus, result, ['operation', 'fulltext']);
	    getParam(op.date+'', result, ['time', 'fulltext'], null, replaceTagsAndSpaces, parseDateISO);
	    sumParam(op.cityName, result, ['location', 'fulltext'], null, null, null, aggregate_join);
	    sumParam(op.countryName, result, ['location', 'fulltext'], null, null, null, aggregate_join);
	    sumParam(op.index, result, ['location', 'fulltext'], null, null, null, aggregate_join);
	    getParam(op.description, result, ['attribute', 'fulltext']);
	    getParam(op.countryCustomName, result, ['operator', 'fulltext']);
//	    getParam(op.Payment+'', result, 'addcost', null, replaceTagsAndSpaces, parseBalance);
	    getParam(getFormattedDate(null, new Date(result.time)) + ': ' + result.operation + ',<br/>' + result.location + ',<br/>' + result.attribute + (result.addcost ? ', Н/п ' + result.addcost + ' ₽' : ''), result, 'fulltext');
	}else{
		AnyBalance.trace('История перемещений не найдена. Пробуем получить последние данные из основной информации...');
		
		getParam(item.commonStatus, result, ['operation', 'fulltext']);
	    getParam(item.lastOperationDateTime+'', result, ['time', 'fulltext'], null, replaceTagsAndSpaces, parseDateISO);
	    sumParam(item.destinationCityName, result, ['location', 'fulltext'], null, null, null, aggregate_join);
	    sumParam(item.destinationCountryName, result, ['location', 'fulltext'], null, null, null, aggregate_join);
	    sumParam(item.indexTo, result, ['location', 'fulltext'], null, null, null, aggregate_join);
	    getParam(item.indexTo, result, ['attribute', 'fulltext'], null, null, null, aggregate_join);
		sumParam(item.destinationCityName, result, ['attribute', 'fulltext'], null, null, null, aggregate_join);
	    getParam('Почта России', result, ['operator', 'fulltext']);
//	    getParam(item.Payment+'', result, 'addcost', null, replaceTagsAndSpaces, parseBalance);
	    getParam(getFormattedDate(null, new Date(result.time)) + ': ' + result.operation + ',<br/>' + result.location + ',<br/>' + result.attribute + (result.addcost ? ', Н/п ' + result.addcost + ' ₽' : ''), result, 'fulltext');
	}
	
	AnyBalance.setResult(result);
}

function mainMainTransport() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	AnyBalance.trace('Пробуем получить данные с сайта Main Transport...');
	var baseurl = 'https://maintransport.ru';
	
	var info = AnyBalance.requestGet(baseurl + '/transportnye-kompanii/pochta-rossii/tracking', g_headers);
	
	if(!info || AnyBalance.getLastStatusCode() >= 400){
        AnyBalance.trace(info);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
	info = AnyBalance.requestPost('https://neva-service.spb.ru/pt.php', {
		'track': prefs.code,
        'dom': 'mt'
	}, addHeaders({
		'Content-Type': 'application/x-www-form-urlencoded',
		'Origin': baseurl,
		'Referer': baseurl + '/'
	}));
	
	if(!/tracking-main-param/i.test(info)){
		var error = getParam(info, null, null, /<div[^>]+common-postal-info[^>]*><h2[^>]*>([\s\S]*?)<\/h2><\/div>/i, replaceTagsAndSpaces);
		if(error)
			throw new AnyBalance.Error(error, null, /не найден/i.test(error));
		AnyBalance.trace(info);
		throw new AnyBalance.Error('Информация о почтовом отправлении не найдена! Проверьте правильность ввода трек-номера: ' + prefs.code);
	}
	
	var result = {success: true};
	
	result.__tariff = prefs.code;
	
	getParam(info, result, 'operation', /Текущий статус[\s\S]*?<div[^>]+class[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(info, result, 'location', /Текущее местоположение[\s\S]*?<div[^>]+class[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(info, result, 'attribute', /Адрес назначения[\s\S]*?<div[^>]+class[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam('Почта России', result, 'operator', null, null);
	getParam(info, result, 'type', /Вид почтового отправления[\s\S]*?<div[^>]+class[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(info, result, 'rank', /Разряд почтового отправления[\s\S]*?<div[^>]+class[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(info, result, 'weight', /Вес[\s\S]*?<div[^>]+class[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, 'to', /Адрес назначения[\s\S]*?<div[^>]+class[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(info, result, 'sender', /Отправитель[\s\S]*?<div[^>]+class[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(info, result, 'recipient', /Получатель[\s\S]*?<div[^>]+class[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	
	var hist = getElement(info, /<div[^>]+class="detailed-postal-info[^>]*>/i);
	var items = getElements(hist, /<div[^>]+class="tracking-history-row[^>]*>/ig);
	
	if(items && items.length && items.length > 0){
		AnyBalance.trace('Найдено статусов отправления: ' + items.length);
		for(var i=items.length-1; i>=0; i--){ // Статус ищем с конца
			var item = items[i];
			
			getParam(item, result, 'time', /Время:([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDateISO);
		    getParam(item, result, 'operation', /Статус:([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
			getParam(item, result, 'location', /Местоположение:([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
			getParam(item, result, 'weight', /Вес:([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
			
			break;
	    }
		getParam(items[0], result, 'from', /Местоположение:([\s\S]*?)<\/div>/i, replaceTagsAndSpaces); // Место отправления получаем из первой записи
		getParam(getFormattedDate(null, new Date(result.time)) + ': ' + result.operation + ',<br/>' + result.location + ',<br/>' + (result.weight ? ' Вес ' + result.weight + ' г' : ''), result, 'fulltext');
	}else{
		AnyBalance.trace('Не удалось получить информацию по статусам отправления');
	}
	
	AnyBalance.setResult(result);
}