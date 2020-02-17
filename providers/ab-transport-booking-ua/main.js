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
    var html = AnyBalance.requestGet(baseurl + 'ru/train_search/station/?term=' + encodeURIComponent(name), g_headers);
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

        AnyBalance.restoreCookies();
   
    // Запрос на поиск пункта отправления
    var station_fromIdAndNameArray = findStationByName(baseurl, prefs.station_from);
    // Запрос на поиск пункта назначения
    var station_toIdAndNameArray = findStationByName(baseurl, prefs.station_to);
    // Запросим данные
    if (!prefs.date_trip) {dt = new Date()
    }else{
       var parts = prefs.date_trip.split(".");
       var dt = new Date(parseInt(parts[2], 10),
                  parseInt(parts[1], 10) - 1,
                  parseInt(parts[0], 10));
    }
    var curDate=new Date();
    var time='00:00';
    if (getFormattedDate('YYYY-MM-DD',dt)==getFormattedDate('YYYY-MM-DD',curDate)) time=getFormattedDate('HH:NN',curDate)
    html = AnyBalance.requestPost(baseurl + 'ru/train_search/', {
        'from':station_fromIdAndNameArray[0],
        'to':station_toIdAndNameArray[0],
        'date':getFormattedDate('YYYY-MM-DD',dt),
        'time':time,
        'get_tpl':'0'
    }, addHeaders({
        'Referer': baseurl + 'ru/',
        'GV-Unique-Host': '1',
        'GV-Ajax': '1',
        'GV-Screen': '1440x900',
        'GV-Referer': 'http://booking.uz.gov.ua/ru/'
//        'GV-Token':token
    })); 
	if (!html || AnyBalance.getLastStatusCode() > 400) 
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	json = getJson(html);	
	var result = {success: true};
	var cap='';
	if (JSON.stringify(json).indexOf('"captcha":"booking"')>0) {
		cap=reCapatcha(station_fromIdAndNameArray[0],station_toIdAndNameArray[0],getFormattedDate('YYYY-MM-DD',dt));
		if (!cap) throw new AnyBalance.Error('Ошибка при попытке распознать капатчу.');

    html = AnyBalance.requestPost(baseurl + 'ru/train_search/', {
        'from':station_fromIdAndNameArray[0],
        'to':station_toIdAndNameArray[0],
        'date':getFormattedDate('YYYY-MM-DD',dt),
        'time':time,
        'captcha':cap,
        'get_tpl':'1'
    }, addHeaders({
        'Referer': baseurl + 'ru/',
        'GV-Unique-Host': '1',
        'GV-Ajax': '1',
        'GV-Screen': '1440x900',
        'GV-Referer': 'http://booking.uz.gov.ua/ru/',
//        'GV-Token':token
    })); 
	if (!html || AnyBalance.getLastStatusCode() > 400) 
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	json = getJson(html);	
		



}
	json=json.data.list;
	var data;
	var otherTrains='';
	if(prefs.train) {
		for(var i = 0; i < json.length; i++) {
			if(endsWith(json[i].num+'', prefs.train)) {
				AnyBalance.trace('Нашли нужный поезд.');
				data = json[i];
				break;
			} else {
				AnyBalance.trace('Поезд с номером ' + json[i].num + ' не соответствует заданному в настройках ' + prefs.train);
			}
		}
	} else {
		if(json.length>1){
		for(var i = 1; i < json.length; i++) otherTrains+=json[i].num + ' ' + json[i].from.stationTrain + '-' + json[i].to.stationTrain+'<br>';
		}    
		data = json[0];
	}

	if(prefs.train&&!data) {
		for(var i = 0; i < json.length; i++) {
			if((json[i].num+'').indexOf(prefs.train)>-1) {
				AnyBalance.trace('Нашли нужный поезд.');
				data = json[i];
				break;
			} else {
				AnyBalance.trace('Поезд с номером ' + json[i].num + ' не соответствует заданному в настройках ' + prefs.train);
			}
		}
	} else {
		if(json.length>1){
		for(var i = 1; i < json.length; i++) otherTrains+=json[i].num + ' ' + json[i].from.stationTrain + '-' + json[i].to.stationTrain+'<br>';
		}    
		data = json[0];
	}

	
	checkEmpty(data, 'Не удалось найти информацию по по рейсам, сайт изменен?', true);
	
	result.__tariff = data.num + ' ' + data.from.stationTrain + '-' + data.to.stationTrain;
	result.depart_station =data.from.station+': '+ data.from.date+' '+data.from.time;
	result.arrival_station =data.to.station+': '+ data.to.date+' '+data.to.time;
        if (otherTrains>'') result.other_trains=otherTrains;
    var types = [];
    var type_luks=0;
    var type_plats=0;
    var type_kupe=0;
    var type_other=0;
    for(var i = 0; i < data.types.length; i++)	{
        var avail_seats = " " + data.types[i].title + ": " + data.types[i].places;
        types.push(avail_seats);
        if (data.types[i].id=='Л') type_luks=data.types[i].places;
        if (data.types[i].id=='К') type_kupe=data.types[i].places;
        if (data.types[i].id=='П') type_plats=data.types[i].places;
        if ('ЛКП'.indexOf(data.types[i].id)==-1) type_other+=data.types[i].places;
	}
	result.type_luks=type_luks;
	result.type_plats=type_plats;
	result.type_kupe=type_kupe;
	result.type_other=type_other;
	result.types = types.toString();
       	AnyBalance.saveCookies();
	AnyBalance.saveData();
	AnyBalance.setResult(result);
	
}
function reCapatcha(from,to,date){
   if(AnyBalance.getLevel() >= 7){
	AnyBalance.trace('Пытаемся ввести капчу');
	var captcha = AnyBalance.requestGet('https://booking.uz.gov.ua/ru/captcha/?0');
	captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
	AnyBalance.trace('Капча получена: ' + captchaa);
   }else{
	throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
   }
    	return captchaa;
}
