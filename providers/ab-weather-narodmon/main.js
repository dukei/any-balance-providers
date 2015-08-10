/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
    AnyBalance.setDefaultCharset('utf-8');
    var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.number, 'Введите номер датчика!');
	
    var number = prefs.number;

    var baseurl = "http://narodmon.ru/client.php";

    var html = AnyBalance.requestPost(baseurl,'{"cmd":"sensorDev","id":"'+number+'","api_key":"90FeOzSOINuLI","uuid":"5d41402abc4b2a76b9719d911017c592"}');
	
	var info = getJson(html);
	
    if(!info.sensors) {
		AnyBalance.trace(html);
        throw new AnyBalance.Error("Датчик с номером " + number + " отсутствует. Проверьте номер!");
	}
	
    var result = {success: true};

    for(var i=0; i<info.sensors.length; ++i){
	var s = info.sensors[i];
	if(s.type == 1 && AnyBalance.isAvailable('temperature'))
		result.temperature=s.value;
	else if(s.type == 2 && AnyBalance.isAvailable('humidity'))
		result.humidity=s.value;
	else if(s.type == 3 && AnyBalance.isAvailable('pressure'))
		result.pressure=s.value
	else
		AnyBalance.trace("unknown sensor type: " + JSON.stringify(s));
    }
	
    AnyBalance.setResult(result);
}