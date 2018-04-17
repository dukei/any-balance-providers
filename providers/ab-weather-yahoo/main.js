/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurlRssAPI = 'http://weather.yahooapis.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	// Сначала ищем город
	checkEmpty(prefs.city, 'Please, enter the city in settings!');
	
	var html = AnyBalance.requestGet("https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20weather.forecast%20where%20woeid%20in%20(select%20woeid%20from%20geo.places(1)%20where%20text%3D%22" + encodeURIComponent(prefs.city) + "%22)%20and%20u%3D%22" + encodeURIComponent(prefs.Degree_units || 'f') + "%22&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&&diagnostics=true", g_headers);
	var json = getJson(html);
	if(json.query.count <= 0){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('The wheather forecast is not found for specified location: ' + prefs.city);
	}

    var result = {success: true};

    var data = json.query.results.channel;
	
	getParam(data.item.condition.temp, result, 'current_temp', null, replaceTagsAndSpaces, parseBalance);
	getParam(data.item.condition.text, result, 'current_text');
	getParam(data.atmosphere.pressure, result, 'current_pressure', null, replaceTagsAndSpaces, parseBalance);
	getParam(data.atmosphere.humidity, result, 'current_humidity', null, replaceTagsAndSpaces, parseBalance);
	getParam(data.astronomy.sunrise, result, 'sunrise', null, replaceTagsAndSpaces, html_entity_decode);
	getParam(data.astronomy.sunset, result, 'sunset', null, replaceTagsAndSpaces, html_entity_decode);
	getParam(data.wind.speed, result, 'wind', null, replaceTagsAndSpaces, parseBalance);

	result.degrees_units = (prefs.Degree_units == 'c' ? '°C' : '°F');
	
	result.pressure_units = data.units.pressure; 
	result.wind_units = data.units.speed;
	result.__tariff = data.location.city + ', ' + data.location.country;
	
    AnyBalance.setResult(result);
}