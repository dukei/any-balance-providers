/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у тверского оператора интернет Горсеть.

Сайт оператора: http://gorcom.ru/
Личный кабинет: http://stat.gorcom.ru
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

function getTrafficGb(str){
  return parseFloat((parseFloat(str)/1024).toFixed(2));
}

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "http://stat.gorcom.ru/";
    var html = AnyBalance.requestPost(baseurl, {
        login: prefs.login,
        password: prefs.password
    });

    var error = getParam(html, null, null, /<p[^>]*style=['"]color:red['"][^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс[\s\S]*?<td[^>]*>(-?\d[\d\.,\s]*)/i, replaceFloat, parseFloat);
    getParam(html, result, 'userName', /ФИО[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', /Основной лицевой счет[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'status', /Состояние интернета[\s\S]*?<td[^>]*>([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'credit', /Кредит[\s\S]*?<td[^>]*>(-?\d[\d\.,\s]*)/i, replaceFloat, parseFloat);

    var html = AnyBalance.requestGet(baseurl + '?module=40_tariffs');
    getParam(html, result, '__tariff', /<td[^>]*>Текущий ТП[\s\S]*?<td[^>]*class=['"]utm-cell['"][^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    
    if(AnyBalance.isAvailable('trafficIn')){
        var now = new Date();
        var m = now.getMonth() + 1;
        var year = now.getFullYear();
        var date1 = Date.UTC(year, m-1, 1) / 1000 + now.getTimezoneOffset()*60;
        var date2 = Date.UTC(year, m, 1) / 1000 + now.getTimezoneOffset()*60;
        var html = AnyBalance.requestPost(baseurl + '?module=30_traffic_report', {
             date1:date1,
             date2:date2,
             month:0,
             year:0
       });

       getParam(html, result, 'trafficIn', /Интернет входящий[\s\S]*?<td[^>]*>(-?\d[\d\.,\s]*)/i, replaceFloat, getTrafficGb);
    }
    
    if(AnyBalance.isAvailable('payments')){
        var now = new Date();
        var m = now.getMonth() + 1;
        var year = now.getFullYear();
        var date1 = Date.UTC(year, m-1, 1) / 1000 + now.getTimezoneOffset()*60;
        var date2 = Date.UTC(year, m, 1) / 1000 + now.getTimezoneOffset()*60;
        var html = AnyBalance.requestPost(baseurl + '?module=32_payments_report', {
             date1:date1,
             date2:date2,
             month:0,
             year:0
       });

       getParam(html, result, 'payments', /Итого[\s\S]*?<td[^>]*>(-?\d[\d\.,\s]*)/i, replaceFloat, parseFloat);
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

