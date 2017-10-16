/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
    AnyBalance.setDefaultCharset('utf-8');
    var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.number, 'Введите номер датчика!');
	
    var number = prefs.number;

    var baseurl = "http://narodmon.ru/api";

    var uuid = AnyBalance.getData('uuid');
    if(!uuid){
    	//Генерируем идентификатор для данного пользователя
    	uuid = hex_md5('' + Math.random());
    	AnyBalance.setData('uuid', uuid);
    	AnyBalance.saveData();
    }

    var html = AnyBalance.requestPost(baseurl, JSON.stringify({
    	cmd: 'sensorsOnDevice',
    	uuid: uuid,
    	api_key: '13UymB4dRWgv.',
    	id: +number,
    	lang: 'ru'
    }), {'User-Agent': 'AnyBalance'});
	
	var info = getJson(html);
	
    if(!info.sensors) {
    	if(info.errno == 429)
    		throw new AnyBalance.Error('Опрос датчиков возможен не чаще раза в минуту. Попробуйте ещё раз позже.');
    	if(info.error)
    		throw new AnyBalance.Error(info.error, null, info.errno == 404);
		AnyBalance.trace(html);
        throw new AnyBalance.Error("Датчик с номером " + number + " отсутствует. Проверьте номер!");
	}
	
    var result = {success: true};

    var allocated = {
    	temperature: 0,
    	humidity: 0,
    	pressure: 0
    };

    for(var i=0; i<info.sensors.length; ++i){
		var s = info.sensors[i];
		AnyBalance.trace('Найден датчик ' + JSON.stringify(s));
		if(s.type == 1){
			getParam(s.value, result, 'temperature' + (allocated.temperature||''));
			++allocated.temperature;
		}else if(s.type == 2){
			getParam(s.value, result, 'humidity' + (allocated.humidity||''));
			++allocated.humidity;
		}else if(s.type == 3){
			getParam(s.value, result, 'pressure' + (allocated.pressure||''));
			++allocated.pressure;
		}else{
			AnyBalance.trace("unknown sensor type: " + JSON.stringify(s));
		}
    }

    result.__tariff = info.name;
	
    AnyBalance.setResult(result);
}