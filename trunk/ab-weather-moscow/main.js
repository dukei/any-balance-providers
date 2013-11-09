/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main() {
    var prefs = AnyBalance.getPreferences();
	
	prefs.critical_data_age = 30 * 60; // seconds
	
	json = AnyBalance.requestGet("http://gradus.melda.ru/data.json?anybalance.v2.0.7");
	
	var data = getJson(json);
	
	var delay = Math.round((new Date().getTime()/1000 - data.ts.data));
    if (delay > prefs.critical_data_age) {
		throw new AnyBalance.Error("Проблемы на сервере: данные устарели более чем на " + parseInt(delay / 60) + " мин.");
    }
	var result = {success: true};

	getParam('<font color="' + data.temperature_color + '">' + data.temperature + '°</font>', result, 'temperature_color');
	getParam(data.temperature, result, 'temperature');

	var dt = new Date(parseInt(data.ts.data)*1000);
	if(dt)
		getParam((dt.getDate() < 10 ? '0'+dt.getDate() : dt.getDate())+'/'+(dt.getMonth()+1 < 10 ? '0'+dt.getMonth()+1 : dt.getMonth()+1)+'/'+dt.getFullYear() + ' ' + dt.getHours()+':' + dt.getMinutes(), result, '__tariff');
    
	//result['__tariff'] = "http://gradus.melda.ru/";
	AnyBalance.setResult(result);
}