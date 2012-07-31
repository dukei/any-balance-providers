/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у одинцовского интернет-провайдера Seventh Sky.

Сайт оператора: http://www.seven-sky.net/
Личный кабинет: https://stat.7-sky.info/
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
  return parseFloat((val/1024/1024/1024).toFixed(2));
}

function main(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('windows-1251');

    var baseurl = "https://stat.7-sky.info/webexecuter";

    var html = AnyBalance.requestPost(baseurl, {
        midAuth:0,
        user:prefs.login,
        pswd:prefs.password
    });

    //AnyBalance.trace(html);

    var error = getParam(html, null, null, /<h2[^>]*>ОШИБКА:([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);
  
    var contractId = getParam(html, null, null, /contractId=(\d+)/);
    if(!contractId)
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Личный кабинет изменился или проблемы на сайте.");

    html = AnyBalance.requestGet(baseurl + "?action=ShowBalance&mid=contract&contractId="+contractId);

    var result = {success: true};

    getParam(html, result, 'balance', /Исходящий остаток на конец месяца[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'prihod', /Приход за месяц \(всего\)[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    getParam(html, result, 'licschet', /Супердоговор:[\s\S]*?<a[^>]*>([^<]*)/i, replaceTagsAndSpaces);

    html = AnyBalance.requestGet(baseurl + "?action=ChangeTariff&mid=contract&contractId="+contractId);
    //Тарифный план в последней строчке таблицы
    getParam(html, result, '__tariff', /Тарифный план[\s\S]*?<tr[^>]*>\s*<td[^>]*>\s*<font[^>]*>([^<]*?)<\/font>\s*<\/td>(\s*<td[^>]*>[^<]*<\/td>){3}\s*<\/tr>\s*<\/tbody>/i, replaceTagsAndSpaces);

    if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
        html = AnyBalance.requestGet(baseurl + "?action=ShowLoginsBalance&mid=1&module=dialup&contractId="+contractId);
        getParam(html, result, 'trafficIn', /Итого:(?:[\s\S]*?<td[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, parseTrafficGb);
        getParam(html, result, 'trafficOut', /Итого:(?:[\s\S]*?<td[^>]*>){5}([^<]*)/i, replaceTagsAndSpaces, parseTrafficGb);
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

