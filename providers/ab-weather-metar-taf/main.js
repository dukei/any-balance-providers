/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
};

function main() {
    var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://aviationweather.gov/cgi-bin/data/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.fieldCode, 'Введите код станции!');
	
	var html = AnyBalance.requestGet(baseurl + 'metar.php?ids=' + prefs.fieldCode + '&sep=true&format=xml', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}
	
	var info = getElement(html, /<METAR[^>]*>/i);
	
    if(!info){
		if(/data_source name="metars"/i.test(html)){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Сводка METAR не найдена. Проверьте правильность ввода кода станции: ' + prefs.fieldCode, null, true);
		}
		
		AnyBalance.trace(html);
	    throw new AnyBalance.Error('Не удалось получить сводку METAR. Сайт изменен?');
	}
	
	AnyBalance.trace('METAR: ' + info);
	
	var result = {success: true};
    
    if(AnyBalance.isAvailable('raw_text'))
        getParam(info, result, 'raw_text', /<raw_text>([\s\S]*?)<\/raw_text>/i, replaceHtmlEntities);

    if(AnyBalance.isAvailable('station_id', '__tariff')){
        getParam(info, result, 'station_id', /<station_id>([\s\S]*?)<\/station_id>/i, replaceHtmlEntities);
		getParam(info, result, '__tariff', /<station_id>([\s\S]*?)<\/station_id>/i, replaceHtmlEntities);
    }

    if(AnyBalance.isAvailable('temp'))
        getParam(info, result, 'temp', /<temp_c>([\s\S]*?)<\/temp_c>/i, replaceHtmlEntities, parseBalance);

    if(AnyBalance.isAvailable('dewpoint'))
        getParam(info, result, 'dewpoint', /<dewpoint_c>([\s\S]*?)<\/dewpoint_c>/i, replaceHtmlEntities, parseBalance);

    if(AnyBalance.isAvailable('wind_dir'))
        getParam(info, result, 'wind_dir', /<wind_dir_degrees>([\s\S]*?)<\/wind_dir_degrees>/i, replaceHtmlEntities, parseBalance);

    if(AnyBalance.isAvailable('wind_speed'))
        getParam(info, result, 'wind_speed', /<wind_speed_kt>([\s\S]*?)<\/wind_speed_kt>/i, replaceHtmlEntities, parseBalance);
    
    if(AnyBalance.isAvailable('wind_gust')){
        getParam(info, result, 'wind_gust', /<wind_gust_kt>([\s\S]*?)<\/wind_gust_kt>/i, replaceHtmlEntities, parseBalance);
        if(!result.wind_gust) result.wind_gust = 0;
    }
	
	if(AnyBalance.isAvailable('visibility'))
        getParam(info, result, 'visibility', /<visibility_statute_mi>([\s\S]*?)<\/visibility_statute_mi>/i, replaceHtmlEntities, parseBalance);
	
	if(AnyBalance.isAvailable('pressure'))
        getParam(info, result, 'pressure', /<altim_in_hg>([\s\S]*?)<\/altim_in_hg>/i, replaceHtmlEntities, parseBalance);
	
	if(AnyBalance.isAvailable('sky_cover'))
	    getParam(info, result, 'sky_cover', /<sky_condition sky_cover="([^"]*)/i, replaceHtmlEntities);
	
	if(AnyBalance.isAvailable('cloud_base'))
	    getParam(info, result, 'cloud_base', /<sky_condition[\s\S]*?cloud_base_ft_agl="([^"]*)/i, replaceHtmlEntities, parseBalance);
	
	if(AnyBalance.isAvailable('flight_category'))
	    getParam(info, result, 'flight_category', /<flight_category>([\s\S]*?)<\/flight_category>/i, replaceHtmlEntities);
	
	if(AnyBalance.isAvailable('elevation'))
        getParam(info, result, 'elevation', /<elevation_m>([\s\S]*?)<\/elevation_m>/i, replaceHtmlEntities, parseBalance);

    if(AnyBalance.isAvailable('observation_time', '__tariff')){
        var dt = getParam(info, result, 'observation_time', /<observation_time>([\s\S]*?)<\/observation_time>/i, replaceHtmlEntities, parseDateISO);
		if(dt){
			var dts = new Date(dt);
			var date = n2(dts.getDate()) + '.' + n2(dts.getMonth()+1) + '.' + dts.getFullYear() + ' ' + n2(dts.getHours()) + ':' + n2(dts.getMinutes());
			if(!result.__tariff){
				result.__tariff = date;
			}else{
				result.__tariff = result.__tariff + ' | ' + date;
			}
		}
    }
        
	if(AnyBalance.isAvailable('taf_raw_text')){
		html = AnyBalance.requestGet(baseurl + 'taf.php?ids=' + prefs.fieldCode + '&sep=true&format=xml', g_headers);
        
	    var info = getElement(html, /<TAF[^>]*>/i);
            if(!info){
			    if(/data_source name="tafs"/i.test(html)){
			    AnyBalance.trace(html);
			    throw new AnyBalance.Error('Прогноз TAF не найден. Проверьте правильность ввода кода станции: ' + prefs.fieldCode, null, true);
		    }
			
		    AnyBalance.trace(html);
	        throw new AnyBalance.Error('Не удалось получить прогноз TAF. Сайт изменен?');
	    }
	
	    AnyBalance.trace('TAF: ' + info);
	
        result['taf_raw_text'] = getParam(info, result, 'taf_raw_text', /<raw_text>([\s\S]*?)<\/raw_text>/i, replaceHtmlEntities);
    }

    AnyBalance.setResult(result);
}
