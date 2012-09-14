/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для питерского интернет-провайдера Эт хоум

Сайт оператора: http://at-home.ru
Личный кабинет: https://billing.at-home.ru/
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

    var baseurl = "https://billing.at-home.ru/";

    var html = AnyBalance.requestPost(baseurl + 'lk/user/authorize/', {
        redirect: 1,
        referer: '/lk/user/plainAuth/',
        login:prefs.login,
        pwd:prefs.password,
        x: 34,
        y: 2
    });

    //AnyBalance.trace(html);
    if(!/\/lk\/user\/logout/.test(html)){
        var error = getParam(html, null, null, /<div[^>]*class=["']p_b_w_text[^>]*>([\s\S]*?)<\/div>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /<td(?:[\s\S](?!<\/td>))*<input[^>]*checked(?:[\s\S](?!<\/td>))*<div[^>]*konstr_param_desc[^>]*>([\S\s]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'abon', /Абонентская плата:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet', /Номер счета:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
        var dt = new Date();
        var html = AnyBalance.requestGet(baseurl + 'lk/report/trafic/?start_date=' + dt.getFullYear() + '-' + (dt.getMonth()+1) + '-' + '01&end_date=' + dt.getFullYear() + '-' + (dt.getMonth()+1) + '-' + dt.getDate() + '&x=27&y=10');

       getParam(html, result, 'trafficIn', /Входящий трафик(?:[\s\S]*?<td[^>]*>){2}([\S\s]*?)<\/td>/i, replaceFloat, parseTrafficGb);
       getParam(html, result, 'trafficOut', /Исходящий трафик(?:[\s\S]*?<td[^>]*>){3}([\S\s]*?)<\/td>/i, replaceFloat, parseTrafficGb);
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

