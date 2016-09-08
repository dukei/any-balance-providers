function main() {
    var BASE_URL = "http://www.aviationweather.gov/adds/dataserver_current/httpparam?requestType=retrieve&format=xml&hoursBeforeNow=24&mostRecent=true";

    var prefs = AnyBalance.getPreferences();

    var metarUrl = BASE_URL + "&dataSource=metars&stationString=" + prefs.fieldCode;
    var tafUrl = BASE_URL + "&dataSource=tafs&stationString=" + prefs.fieldCode;

    var info = AnyBalance.requestGet(metarUrl);
    var xmlDoc = $.parseXML(info), $xml = $(xmlDoc);
    AnyBalance.trace("response:" + info);
    var result = {};

    var $metar = $xml.find("METAR");
    if (!$metar)
            throw new AnyBalance.Error(info);
    
    if(AnyBalance.isAvailable("raw_text")){
        var $rawText = $metar.find("raw_text");
        result.raw_text = $rawText.text();
    }

    if(AnyBalance.isAvailable("station_id")){
        var $stationId = $metar.find("station_id");
        result.station_id = $stationId.text();
    }

    if(AnyBalance.isAvailable("temp")){
        var $temp = $metar.find("temp_c");
        result.temp = parseFloat($temp.text());
    }

    if(AnyBalance.isAvailable("dewpoint")){
        var $dewpoint = $metar.find("dewpoint_c");
        result.dewpoint = parseFloat($dewpoint.text());
    }

    if(AnyBalance.isAvailable("wind_dir")){
        var $windDir = $metar.find("wind_dir_degrees");
        result.wind_dir = parseInt($windDir.text());
    }

    if(AnyBalance.isAvailable("wind_speed")){
        var $windSpeed = $metar.find("wind_speed_kt");
        result.wind_speed = parseInt($windSpeed.text());
    }
    
    if(AnyBalance.isAvailable("wind_gust")){
        var $windGust = $metar.find("wind_gust_kt");
        result.wind_gust = parseInt($windGust.text());
        if (!result.wind_gust) result.wind_gust = 0;
    }

    if(AnyBalance.isAvailable("observation_time")){
        var $observationTime = $metar.find("observation_time");
        result.observation_time = Date.parse($observationTime.text());
    }

    var info = AnyBalance.requestGet(tafUrl);
    var xmlDoc = $.parseXML(info), $xml = $(xmlDoc);
    AnyBalance.trace("response:" + info);

    var $taf = $xml.find("TAF");
    if (!$taf)
            throw new AnyBalance.Error(info);
    
    if(AnyBalance.isAvailable("taf_raw_text")){
        var $tafRawText = $taf.find("raw_text");
        result.taf_raw_text = $tafRawText.text();
    }
    
    result.success=true;

    AnyBalance.setResult(result);
}
