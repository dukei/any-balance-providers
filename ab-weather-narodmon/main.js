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
	
	if (info.sensors.length>=1) result.temperature=info.sensors[0].value;
	if (info.sensors.length>=2) result.humidity=info.sensors[1].value;
	if (info.sensors.length>=3) result.pressure=info.sensors[2].value;
    AnyBalance.setResult(result);
}