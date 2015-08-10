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
	checkEmpty(prefs.date_trip, 'Введите дату!');
	
	var html = AnyBalance.requestGet(baseurl + 'ru/', g_headers);
	
	if (!html || AnyBalance.getLastStatusCode() > 400) 
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');

        var svAB = AnyBalance;
        this.fake_localStorage = {
	    setItem: function(key, value) {
		svAB.trace('Получили token (' + key + '): ' + value);
		token = value;
	    }
        }

	var obf_script = getParam(html, null, null, /(\$\$_=~[\s\S]*?)\(function\s*\(\s*\)\s*\{\s*var\s+ga/);
        
        (0).constructor.constructor = function(str){ //Обфусцированный скрипт использует это для выполнения кода
		if(str && typeof(str)=='string' && /localStorage/.test(str)){
			str = str.replace(/localStorage/g, 'fake_localStorage');
		}
		return Function.apply(null, arguments);
	}

	safeEval(obf_script);
    
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
        'GV-Unique-Host': '1',
        'GV-Ajax': '1',
        'GV-Screen': '1440x900',
        'GV-Referer': 'http://booking.uz.gov.ua/ru/',
        'GV-Token':token
    })); 
    
	json = getJson(html);	
	if(json.error) {
		throw new AnyBalance.Error(json.value);
	}
    
	var result = {success: true};
	
    result.train = json.value[0].num;
    result.depart_station = json.value[0].from.station;
    result.depart_time = json.value[0].from.src_date;
    result.arrival_station = json.value[0].till.station;
    result.arrival_time = json.value[0].till.src_date;
    
    var types = [];
    
    for(var i = 0; i < json.value[0].types.length; i++)	{
        var avail_seats = " " + json.value[0].types[i].title + ": " + json.value[0].types[i].places;
        types.push(avail_seats);
	}
    result.types = types.toString();
	
	AnyBalance.setResult(result);
}

function safeEval(script, argsNamesString, argsArray) {
   var svAB = AnyBalance, svParams = this.g_AnyBalanceApiParams, svApi = this._AnyBalanceApi;
   AnyBalance = this.g_AnyBalanceApiParams = this._AnyBalanceApi = undefined;

   try{
       var result = new Function(argsNamesString || 'ja0w4yhwphgawht984h', 'AnyBalance', 'g_AnyBalanceApiParams', '_AnyBalanceApi', script).apply(null, argsArray);
       return result;
   }catch(e){
       throw new svAB.Error('Bad javascript (' + e.message + '): ' + script);
   }finally{
   		AnyBalance = svAB, g_AnyBalanceApiParams = svParams, _AnyBalanceApi=svApi;
   }
}