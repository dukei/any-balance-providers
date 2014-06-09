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
	
	var html = AnyBalance.requestGet('http://sugg.us.search.yahoo.net/gossip-gl-location/?appid=weather&output=sd1&p2=cn,t,pt,z&callback=YUI.Env.JSONP.yui_3_9_1_1_1380964963051_1216&lc=en-US&p1=26.24441909790039,50.61938858032227&command=' + encodeURIComponent(prefs.city), g_headers);

	var woeid = getParam(html, null, null, /woeid=(\d+)/i);
	checkEmpty(woeid, 'Cant find city ID! Please, check the city in settings ('+prefs.city+')', true);
	
	html = AnyBalance.requestGet(baseurlRssAPI+'forecastrss?w='+woeid + (prefs.Degree_units ? '&u='+prefs.Degree_units : ''), g_headers);
	
	if(/<title>Yahoo! Weather - Error/i.test(html)) {
		var error = getParam(html, null, null, /<title>Yahoo! Weather - Error(?:[\s\S]*?<title>)([\s\S]*?)<\/description>/i, replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Error, cant find weather for city '+prefs.city);
	}
	
    var result = {success: true};
	
	getParam(html, result, 'current_temp', /<yweather:condition[^>]*temp="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'current_text', /<yweather:condition[^>]*text="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'current_pressure', /<yweather:atmosphere[^>]*pressure="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'current_humidity', /<yweather:atmosphere[^>]*humidity="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'sunrise', /<yweather:astronomy[^>]*sunrise="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'sunset', /<yweather:astronomy[^>]*sunset="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'wind', /<yweather:wind[^>]*speed="([^"]*)/i, replaceTagsAndSpaces, parseBalance);

	result.degrees_units = (prefs.Degree_units == 'c' ? 'C°' : 'F°');
	
	result.pressure_units = getParam(html, null, null, /<yweather:units[^>]*pressure="([^"]*)/i); 
	result.wind_units = getParam(html, null, null, /<yweather:units[^>]*speed="([^"]*)/i);
	result.__tariff = getParam(html, null, null, /<yweather:location[^>]*city="([^"]*)/i) + ', ' + getParam(html, null, null, /<yweather:location[^>]*country="([^"]*)/i)
	
    AnyBalance.setResult(result);
}