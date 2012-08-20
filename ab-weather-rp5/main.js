/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Прогноз погоды с сайта http://rp5.ru
XML данные с http://rp5.ru/docs/xml/ru
*/

/**
 * Date.parse with progressive enhancement for ISO 8601 <https://github.com/csnover/js-iso8601>
 * © 2011 Colin Snover <http://zetafleet.com>
 * Released under MIT license.
 */
(function (Date, undefined) {
    var origParse = Date.parse, numericKeys = [ 1, 4, 5, 6, 7, 10, 11 ];
    Date.parse = function (date) {
        var timestamp, struct, minutesOffset = 0;

        // ES5 §15.9.4.2 states that the string should attempt to be parsed as a Date Time String Format string
        // before falling back to any implementation-specific date parsing, so that’s what we do, even if native
        // implementations could be faster
        //              1 YYYY                2 MM       3 DD           4 HH    5 mm       6 ss        7 msec        8 Z 9 ±    10 tzHH    11 tzmm
        if ((struct = /^(\d{4}|[+\-]\d{6})(?:-(\d{1,2})(?:-(\d{1,2}))?)?(?:(?:T|\s+)(\d{1,2}):(\d{1,2})(?::(\d{1,2})(?:\.(\d{1,3}))?)?(?:(Z)|([+\-])(\d{2})(?::(\d{2}))?)?)?$/.exec(date))) {
            // avoid NaN timestamps caused by “undefined” values being passed to Date.UTC
            for (var i = 0, k; (k = numericKeys[i]); ++i) {
                struct[k] = +struct[k] || 0;
            }

            // allow undefined days and months
            struct[2] = (+struct[2] || 1) - 1;
            struct[3] = +struct[3] || 1;

            if (struct[8] !== 'Z' && struct[9] !== undefined) {
                minutesOffset = struct[10] * 60 + struct[11];

                if (struct[9] === '+') {
                    minutesOffset = 0 - minutesOffset;
                }
            }

            timestamp = new Date(struct[1], struct[2], struct[3], struct[4], struct[5] + minutesOffset, struct[6], struct[7]).getTime();
        }
        else {
            timestamp = origParse ? origParse(date) : NaN;
        }

        return timestamp;
    };
}(Date));

function parseDate(str){
    var time = Date.parse(str);
    AnyBalance.trace("Parsing date " + new Date(time) + " from " + str);
    return time;
}

function main(){
	AnyBalance.setDefaultCharset('utf-8');
        var prefs = AnyBalance.getPreferences();

        if(!prefs.city)
            throw new AnyBalance.Error("Укажите код города для показа прогноза погоды. Код можно получить на сайте http://rp5.ru. Смотрите описание провайдера для подробностей.");

        AnyBalance.trace("About to request \"http://rp5.ru/xml/"+prefs.city+"/00000/ru\"");

        var xml = AnyBalance.requestGet("http://rp5.ru/xml/"+prefs.city+"/00000/ru");
        if(/404 Not Found/i.test(xml))
            throw new AnyBalance.Error('Похоже, введенный код города "' + prefs.city + '" неверный.'); 
	var xmlDoc = $.parseXML(xml),
          $xml = $(xmlDoc);
     
	var result = {success: true};
        if(AnyBalance.isAvailable('point_name'))
            result.point_name = $xml.find('point>point_name').text();
        result.__tariff = $xml.find('point>point_name').text();
        
        var wasToday = false;
        $timesteps = $xml.find('timestep').each(function(index){
            var $timestep = $(this);
            var hour = parseInt($timestep.find('G').text());
           
            if(8 < hour && hour <= 20){ //Это день
                var shift = parseInt($timestep.find('time_step').text());
                var suffix = wasToday ? '2' : '1';
                wasToday = true;
                
        	if(AnyBalance.isAvailable('date'+suffix))
                    result['date'+suffix] = parseDate($timestep.find('datetime').text());
        	if(AnyBalance.isAvailable('cloud'+suffix))
                    result['cloud'+suffix] = parseFloat($timestep.find('cloud_cover').text());
        	if(AnyBalance.isAvailable('temp'+suffix))
                    result['temp'+suffix] = parseFloat($timestep.find('temperature').text());
        	if(AnyBalance.isAvailable('humidity'+suffix))
                    result['humidity'+suffix] = parseFloat($timestep.find('humidity').text());
        	if(AnyBalance.isAvailable('wind_dir'+suffix))
                    result['wind_dir'+suffix] = $timestep.find('wind_direction').text();
        	if(AnyBalance.isAvailable('wind_vel'+suffix))
                    result['wind_vel'+suffix] = parseFloat($timestep.find('wind_velocity').text());
        	if(AnyBalance.isAvailable('falls'+suffix)){
                    var falls = ['без осадков', 'дождь', 'дождь со снегом', 'снег'];
                    result['falls'+suffix] = falls[parseInt($timestep.find('falls').text())];
                }
        	if(AnyBalance.isAvailable('precip'+suffix))
                    result['precip'+suffix] = parseFloat($timestep.find('precipitation').text());
            }
        });

	AnyBalance.setResult(result);
}
