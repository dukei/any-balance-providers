/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у московского интернет-провайдера Ecotelecom.

Сайт оператора: http://www.ecotelecom.ru
Личный кабинет: https://bill.ecotelecom.ru
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

var replaceTagsAndSpaces = [/&nbsp;/g, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseTrafficGb(str){
  var val = getParam(str.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
  var ret = parseFloat((val/1024/1024/1024).toFixed(2));
  AnyBalance.trace('Parsed traffic ' + ret + 'Gb from ' + str);
  return ret;
}

function main(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://bill.ecotelecom.ru/";

    var html = AnyBalance.requestPost(baseurl, {
        user:prefs.login,
        pswd:prefs.password,
        'submit.x':26,
        'submit.y':9,
        submit:'submit'
    });

    //AnyBalance.trace(html);

    if(!/\?action=Exit/i.test(html)){
        var error = getParam(html, null, null, /<h2[^>]*>ОШИБКА:([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Личный кабинет изменился или проблемы на сайте.");
    }

    var contractId = getParam(html, null, null, /contractId=(\d+)/);
    if(!contractId)
        throw new AnyBalance.Error("Не удалось найти номер контракта. Личный кабинет изменился или проблемы на сайте.");

    html = AnyBalance.requestGet(baseurl + "?action=ShowBalance&mid=contract&contractId="+contractId);

    var result = {success: true};

    getParam(html, result, 'balance', /Текущий баланс[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'prihod', /Приход за месяц \(всего\)[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    getParam(html, result, 'licschet', /Супердоговор:[\s\S]*?<a[^>]*>([^<]*)/i, replaceTagsAndSpaces);

    html = AnyBalance.requestGet(baseurl + "?action=ChangeTariff&mid=contract&contractId="+contractId);
    //Тарифный план в последней строчке таблицы
    getParam(html, result, '__tariff', /Тарифный план[\s\S]*<tr[^>]*>\s*<td[^>]*>\s*<font[^>]*>([^<]*?)<\/font>/i, replaceTagsAndSpaces);

    var dt = new Date();

    if(AnyBalance.isAvailable('trafficIn')){
        html = AnyBalance.requestGet(baseurl + "webexecuter?module=ipn&mid=1&action=ShowStat&unit=1&day=0&month=" + (dt.getMonth() + 1) + '&year=' + dt.getFullYear() + '&services=1');
        getParam(html, result, 'trafficIn', /Итого:([^<]*)/i, replaceTagsAndSpaces, parseTrafficGb);
    }

    if(AnyBalance.isAvailable('trafficOut')){
        html = AnyBalance.requestGet(baseurl + "webexecuter?module=ipn&mid=1&action=ShowStat&unit=1&day=0&month=" + (dt.getMonth() + 1) + '&year=' + dt.getFullYear() + '&services=2');
        getParam(html, result, 'trafficOut', /Итого:([^<]*)/i, replaceTagsAndSpaces, parseTrafficGb);
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

