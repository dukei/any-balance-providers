﻿/**
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
    var html = AnyBalance.requestGet(baseurl + 'ru/purchase/station/?term=' + encodeURIComponent(name), g_headers);
    
    var json = getJson(html);
    
    var value = json[0];
    checkEmpty(value, 'Не удалось найти станцию (' + name + '), проверьте, что вы правильно ввели её название. Как на сайте http://booking.uz.gov.ua/ru/', true);
    
    return [value.value, value.label];
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://booking.uz.gov.ua/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.station_from, 'Введите пункт отправления!');
	checkEmpty(prefs.station_to, 'Введите пункт назначения!');
	checkEmpty(prefs.date_trip, 'Введите дату!');
	
	var html = AnyBalance.requestGet(baseurl + 'ru/', g_headers);
	
	if (!html || AnyBalance.getLastStatusCode() > 400) 
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');

	var svAB = AnyBalance, token;
	this.fake_localStorage = {
	    setItem: function(key, value) {
			svAB.trace('Получили token (' + key + '): ' + value);
			token = value;
		}
	}

	if(obf_script){
		var obf_script = getParam(html, /\$\$_=~[\s\S]*?\(\);/);
            
		(0).constructor.constructor = function(str){ //Обфусцированный скрипт использует это для выполнения кода
			if(str && typeof(str)=='string' && /localStorage/.test(str)){
				str = str.replace(/localStorage/g, 'fake_localStorage');
			}
			return Function.apply(null, arguments);
		}
	    
		safeEval(obf_script);
		if(!token)
			throw new AnyBalance.Error('Не удалось получить token авторизации. Сайт изменен?');
	}
    
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
        'time_dep':prefs.time_trip || '00:00',
        'time_dep_till':'',
        'another_ec':'0',
        'search':''
    }, addHeaders({
        'Referer': baseurl + 'ru/',
        'GV-Unique-Host': '1',
        'GV-Ajax': '1',
        'GV-Screen': '1440x900',
        'GV-Referer': 'http://booking.uz.gov.ua/ru/',
//        'GV-Token':token
    })); 
    
	json = getJson(html);	
	if(json.error) {
		throw new AnyBalance.Error(json.value);
	}
    
	var result = {success: true};
	
	var data;
	
	if(prefs.train) {
		for(var i = 0; i < json.value.length; i++) {
			if(endsWith(json.value[i].num+'', prefs.train)) {
				AnyBalance.trace('Нашли нужный поезд.');
				data = json.value[i];
				break;
			} else {
				AnyBalance.trace('Поезд с номером ' + json.value[i].num + ' не соответствует заданному в настройках ' + prefs.train);
			}
		}
	} else {
		data = json.value[0];
	}
	
	checkEmpty(data, 'Не удалось найти информацию по по рейсам, сайт изменен?', true);
	
	getParam(data.num, result, 'train');
	getParam(data.from.station, result, 'depart_station');
	getParam(data.from.src_date, result, 'depart_time');
	getParam(data.till.station, result, 'arrival_station');
	getParam(data.till.src_date, result, 'arrival_time');
    
    var types = [];
    
    for(var i = 0; i < data.types.length; i++)	{
        var avail_seats = " " + data.types[i].title + ": " + data.types[i].places;
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