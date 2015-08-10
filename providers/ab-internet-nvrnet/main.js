/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для новороссийского интернет-провайдера Спринт

Сайт оператора: http://nvrnet.ru
Личный кабинет: http://nvrnet.ru/home
*/

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

function parseTrafficGb(str){
  var val = getParam(str.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
  return parseFloat((val/1024).toFixed(2));
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://nvrnet.ru/";

    var html = AnyBalance.requestGet(baseurl + 'home');
    html = AnyBalance.requestPost(baseurl + 'home', {
        'form-id':'sprint-statistics',
        login:prefs.login,
        password:prefs.password,
        'op.x':16,
        'op.y':7        
    });

    //AnyBalance.trace(html);
    if(!/\/logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class=["'][^'"]*error[^>]*>([\s\S]*?)<\/div>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс:[\S\s]*?<span[^>]*>([\S\s]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet', /л\. счет:[\S\s]*?<span[^>]*>([\S\s]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);

    html = AnyBalance.requestGet(baseurl + "utm5/tariffs");
    getParam(html, result, '__tariff', /Тарифный план[\S\s]*?<td[^>]*>([\S\s]*?)(?:<a|<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
        html = AnyBalance.requestGet(baseurl + "utm5/traffic");
        var uid = getParam(html, null, null, /uid1=(\d+)/i);
        var now = new Date();
        var begin = new Date(now.getFullYear(), now.getMonth(), 1);

        html = AnyBalance.requestGet(baseurl + 'utm5/traffic?ajax=1&d11=' + Math.round(begin.getTime()/1000) + '&d22=' + Math.round(now.getTime()/1000) + '&uid1=' + uid + '&sort1=common&group_ip=0');

       getParam(html, result, 'trafficIn', /Incoming[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceFloat, parseTrafficGb);
       getParam(html, result, 'trafficOut', /Outgoing[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceFloat, parseTrafficGb);
    }
    
    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

