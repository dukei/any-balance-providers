/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у интернет-провайдера spnet.

Сайт оператора: http://spnet.ru/
Личный кабинет: https://bill.spnet.ru
*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var value = regexp.exec (html);
	if (value) {
		value = value[1];
		if (replaces) {
			for (var i = 0; i < replaces.length; i += 2) {
				value = value.replace (replaces[i], replaces[i+1]);
			}
		}
		if (parser)
			value = parser (value);

    if(param)
      result[param] = value;
    else
      return value
	}
}

function parseTrafficGb(str){
  return parseFloat((parseFloat(str)/1024).toFixed(2));
}

var replaceTagsAndSpaces = [/&nbsp;/g, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://bill.spnet.ru/client/index.php";
    var html = AnyBalance.requestPost(baseurl, {
        login: prefs.login,
        password: prefs.password
    });

    var error = getParam(html, null, null, /<p[^>]*class="error_text"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    var result = {success: true};

    getParam(html, result, 'balance', />Баланс(?:[\s\S]*?<td[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'userName', />Вы:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', />Номер договора(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /<nobr>([^<]*)<\/nobr>\s*<a[^>]*Изменить тариф/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('trafficIn', 'trafficOut', 'traffic')){
        var now = new Date();
        var m = now.getMonth() + 1;
        var year = now.getFullYear();
        var html = AnyBalance.requestPost(baseurl, {
            devision:2,
            service:1,
            vgstat:0,
            timeblock:3,
            year_from:year,
            month_from:m,
            day_from:1,
            year_till:year,
            month_till:m,
            day_till:now.getDate()
       });
            
       getParam(html, result, 'trafficIn', />Входящий \(Мб\)(?:[\s\S]*?<td[^>]*>){6}([^<]*)/i, replaceTagsAndSpaces, parseTrafficGb);
       getParam(html, result, 'trafficOut', />Исходящий \(Мб\)(?:[\s\S]*?<td[^>]*>){6}([^<]*)/i, replaceTagsAndSpaces, parseTrafficGb);
       getParam(html, result, 'traffic', />Сумма \(Мб\)(?:[\s\S]*?<td[^>]*>){6}([^<]*)/i, replaceTagsAndSpaces, parseTrafficGb);
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

