/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Router Novatel MiFi 2200 - маршрутизатор раздающий беспроводный интернет 3G стандарта CDMA (1xRTT, 1xEVDO Rev. A/0) по Wi-Fi (802.11b/g).
Стандартный адрес устройства: http://192.168.1.1/
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	var html = AnyBalance.requestPost('http://' + (prefs.ipaddress || '192.168.1.1') + '/');
	
//        if(!/\?logout/i.test(html))
		//throw new AnyBalance.Error('Не удалось зайти в статистику. Проверьте ip-адрес.');
                
	var result = {success: true};
	//Название
        getParam(html, result, '__tariff', /<div\s*id=[^<]*networkRat[^<]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	
	//Заряд батареи
	getParam(html, result, 'battery', /batte*r*y*([0-4])\.gif/i, replaceTagsAndSpaces, level2pct);
	
	//Уровень сигнала
	getParam(html, result, 'network_level', /rssi([0-5])\.gif/i, replaceTagsAndSpaces, level2plt);
	
	//Количество подключенных пользователей
	getParam(html, result, 'users', /Users :<\/td>\s<td class=[^<]*rightstd[^<]* title=[^<]*>\s<span id=[^<]*clconn[^<]*>([0-5])<\/span>&nbsp;\/&nbsp;<span id=[^<]*clallow[^<]*>5<\/span>/i, replaceTagsAndSpaces, parseBalance);
	
	//Время соединения
        getParam(html, result, 'connected_time', /Connected Time: <\/td>\s<td class=[^<]*rightstd[^<]*>\s<span id=[^<]*sessionTime[^<]*> ([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseSeconds);
	
        //Принятый трафик
        getParam(html, result, 'traffic_received', /Received: <\/td>\s<td class=[^<]*rightstd[^<]*>\s<span id=[^<]*sessionRx[^<]*>([\d,\.]* (kb|mb|gb|кб|мб|гб|байт|bytes))<\/span>/i, null, parseTraffic);
	
        //Отправленный трафик
        getParam(html, result, 'traffic_transmitted', /Transmitted: <\/td>\s<td class=[^<]*rightstd[^<]*>\s<span id=[^<]*sessionTx[^<]*>([\d,\.]* (kb|mb|gb|кб|мб|гб|байт|bytes))<\/span>/i, null, parseTraffic);
	

	AnyBalance.setResult(result);
}

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var matches = regexp.exec (html), value;
	if (matches) {
		value = matches[1];
		if (replaces) {
			for (var i = 0; i < replaces.length; i += 2) {
				value = value.replace (replaces[i], replaces[i+1]);
			}
		}
		if (parser)
			value = parser (value);

    if(param)
      result[param] = value;
	}
   return value
}

var replaceTagsAndSpaces = [/&nbsp;/g, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseSeconds(str){
    var matches = /(\d+):0*(\d+):0*(\d+)/.exec(str);
    var time;
    if(matches){
	  time = (+matches[1])*3600 + (+matches[2])*60 + (+matches[3]);
          AnyBalance.trace('Parsing seconds ' + time + ' from value: ' + str);
          return time;
    }
    AnyBalance.trace('Could not parse seconds from value: ' + str);
}

function sumParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

        var total_value;
	html.replace(regexp, function(str, value){
		for (var i = 0; replaces && i < replaces.length; i += 2) {
			value = value.replace (replaces[i], replaces[i+1]);
		}
		if (parser)
			value = parser (value);
                if(typeof(total_value) == 'undefined')
                	total_value = value;
                else
                	total_value += value;
        });

    if(param && typeof(total_value) != 'undefined'){
      if(typeof(result[param]) == 'undefined')
      	result[param] = total_value;
      else 
      	result[param] += total_value;
    }else{
      return total_value;
    }
}

function parseTraffic(text){
    var _text = text.replace(/\s+/, '');
    var val = sumParam(_text, null, null, /(-?\d[\d\.,]*)/, replaceFloat, parseFloat);
    var units = sumParam(_text, null, null, /(kб|kb|mb|gb|кб|мб|гб|байт|bytes)/i);
    switch(units.toLowerCase()){
      case 'bytes':
      case 'байт':
        val = Math.round(val/1024/1024*100)/100;
        break;
      case 'kб':
      case 'kb':
      case 'кб':
        val = Math.round(val/1024*100)/100;
        break;
      case 'gb':
      case 'гб':
        val = Math.round(val*1024);
        break;
    }
    var textval = ''+val;
    if(textval.length > 6)
      val = Math.round(val);
    else if(textval.length > 5)
      val = Math.round(val*10)/10;

    AnyBalance.trace('Parsing traffic (' + val + ') from: ' + text);
    return val;
}

function level2pct(str){
    var level = [0, 25, 50, 75, 100];
    var pct = level[parseInt(str)];
    return pct;
}

function level2plt(str){
    var level = [0, 20, 40, 60, 80, 100];
    var plt = level[parseInt(str)];
    return plt;
}

