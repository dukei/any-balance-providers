/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': '*/*',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
    'Origin':'http://booking.uz.gov.ua/',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function findStationByName(baseurl, name) {
    var html = AnyBalance.requestPost(baseurl + 'ru/purchase/station/' + encodeURIComponent(name), {}, g_headers);
    
    var json = getJson(html);
    
    var value = json.value[0];
    checkEmpty(value, 'Не удалось найти станцию (' + name + '), сайт изменен?', true);
    
    return [value.station_id, value.title];
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://booking.uz.gov.ua/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.station_from, 'Введите пункт отправления!');
	checkEmpty(prefs.station_to, 'Введите пункт назначения!');
	
	var html = AnyBalance.requestGet(baseurl + 'ru/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    
    
    var window = {localStorage: {setItem: function(str) {
        alert(str);
    }}};
    safeEval(window, g_obf_script);
    
    
    // Запрос на поиск пункта отправления
    var station_fromIdAndNameArray = findStationByName(baseurl, prefs.station_from);
    // Запрос на поиск пункта назначения
    var station_toIdAndNameArray = findStationByName(baseurl, prefs.station_to);
    // Запросим данные
    html = AnyBalance.requestPost(baseurl + 'ru/purchase/search/', {
        'station_id_from':station_fromIdAndNameArray[0],
        'station_id_till':station_toIdAndNameArray[0],
        'station_from':station_fromIdAndNameArray[1],
        'station_till':station_toIdAndNameArray[1],
        'date_dep':prefs.date_trip,
        'time_dep':'00:00',
        'time_dep_till':'',
        'another_ec':'0',
        'search':''
    }, addHeaders({
        'Referer': baseurl + 'ru/',
        'GV-Unique-Host': 1,
        'GV-Ajax': 1,
        'GV-Screen': '1440x900',
        'GV-Referer': 'http://booking.uz.gov.ua/ru/',
        'GV-Token':''
    })); 
    
    
	var result = {success: true};
	
	getParam(html, result, 'balance', /баланс:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /Текущий баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'fio', /Имя абонента:(?:[\s\S]*?<b[^>]*>){1}([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'phone', /Номер:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'deadline', /Действителен до:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'status', /Статус:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}

function safeEval(window, script) {
   try{
       var result = new Function('window', 'document', 'self', 'location', 'AnyBalance', 'g_AnyBalanceApiParams', '_AnyBalanceApi', script).call(window, window, window.document, window, window.location);
       return result;
   }catch(e){
       throw new AnyBalance.Error('Bad javascript (' + e.message + '): ' + script);
   }
}