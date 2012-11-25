/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Прогноз погоды с сайта http://rp5.ru
XML данные с http://rp5.ru/docs/xml/ru
*/

function parseDate(str){
  //Рассчитывает на библиотеку date.js
  var dt = Date.parse(str);
  if(!dt){
      AnyBalance.trace('Can not parse date from ' + str);
      return;
  }

  dt = new Date(dt);
  
  AnyBalance.trace('Parsed date ' + dt.toString() + ' from ' + str);
  return dt.getTime(); 
}

function main(){
	AnyBalance.setDefaultCharset('utf-8');
        var prefs = AnyBalance.getPreferences();

        if(!prefs.city)
            throw new AnyBalance.Error("Укажите код города для показа прогноза погоды. Код можно получить на сайте http://rp5.ru. Смотрите описание провайдера для подробностей.");

        AnyBalance.trace("About to request \"http://rp5.ru/xml/"+prefs.city+"/00000/ru\"");

        var retry = false;
        try{
            var xml = AnyBalance.requestGet("http://rp5.ru/xml/"+prefs.city+"/00000/ru");
            retry = /404 Not Found/i.test(xml);
        }catch(e){
            retry = true;
            AnyBalance.trace('Проблема получения xml: ' + e.message);
        }
        if(retry){
            AnyBalance.trace('Похоже, rp5 заблокировал ваш IP :( Пробуем парсить HTML страницу.');
            var html = AnyBalance.requestGet('http://wap.rp5.ru/' + prefs.city + "/ru");
            parseHtml(html);
        }else{
            parseXml(xml);
        }
}

function parseHtml(html){
        if(!/\/wap\/style.css/i.test(html))
            throw new AnyBalance.Error('Не удаётся получить данные по выбранному городу. Неверный код города?');

	var result = {success: true};
        getParam(html, result, '__tariff', /<h1[^>]*>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces, html_entity_decode);

        var wasToday = false;
        html.replace(/<tr><td><b>(?:пн|вт|ср|чт|пт|сб|вс)(?:[\s\S]*?<\/tr>){5}/ig, function(tr){
            var time = getParam(tr, null, null, /<tr><td><b>(?:пн|вт|ср|чт|пт|сб|вс),([^<]*)/i, replaceTagsAndSpaces, parseDate);
            var hour = new Date(time).getHours();
            
            if(8 < hour && hour <= 20){ //Это день
                var suffix = wasToday ? '2' : '1';
                wasToday = true;

                getParam(tr, result, 'date'+suffix, /<tr><td><b>(?:пн|вт|ср|чт|пт|сб|вс),([^<]*)/i, replaceTagsAndSpaces, parseDate);
                getParam(tr, result, 'cloud'+suffix, /облачность([^<]*)/i, replaceTagsAndSpaces, parseBalance);
                getParam(tr, result, 'temp'+suffix, /(?:[\s\S]*?<tr[^>]*>){4}([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, parseBalance);
                getParam(tr, result, 'humidity'+suffix, /влажность([^<]*)/i, replaceTagsAndSpaces, parseBalance);
                getParam(tr, result, 'wind_dir'+suffix, />ветер([^,]*)/i, replaceTagsAndSpaces, html_entity_decode);
                getParam(tr, result, 'wind_vel'+suffix, />ветер(.*?)м\/сек/i, replaceTagsAndSpaces, parseBalance);
                getParam(tr, result, 'falls'+suffix, /(?:[\s\S]*?<tr[^>]*>){4}.*?,([^\(,]*)/i, replaceTagsAndSpaces, html_entity_decode);
                getParam(tr, result, 'precip'+suffix, /(?:[\s\S]*?<tr[^>]*>){4}.*?,(.*?)мм/i, replaceTagsAndSpaces, parseBalance);
                
            }
        });

	AnyBalance.setResult(result);
}

function parseXml(xml){
	var xmlDoc = $.parseXML(xml),
          $xml = $(xmlDoc);

        if(!$xml.find('point>point_name').text() && !$xml.find('point>country_id').text())
          throw new AnyBalance.Error("Похоже, код города " + prefs.city + " неверный.");
     
	var result = {success: true};
        if(AnyBalance.isAvailable('point_name'))
            result.point_name = $xml.find('point>point_name').text();
        result.__tariff = $xml.find('point>point_name').text();
        
        var wasToday = false;
        $timesteps = $xml.find('timestep').each(function(index){
            var $timestep = $(this);
            var hour = parseInt($timestep.find('G').text());
           
            if(8 < hour && hour <= 20){ //Это день
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
