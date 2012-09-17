/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у екатеринбургского интернет-провайдера Планета.

Сайт оператора: http://weburg.net/
Личный кабинет: https://weburg.me/planeta
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
  return parseFloat((val/1024).toFixed(2));
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');

    var baseurl = "https://weburg.me/planeta";

    var html = AnyBalance.requestPost(baseurl + '/login', {
        'planeta[login]':prefs.login,
        'planeta[password]':prefs.password
    });

    //AnyBalance.trace(html);
    if(!/pl-logout/i.test(html)){
        var error = getParam(html, null, null, /<p[^>]*error_message[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Личный кабинет изменился или проблемы на сайте.");
    }
    
    var result = {success: true};

    getParam(html, result, '__tariff', /<div[^>]*pl-curent-tarif-title[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    getParam(html, result, 'licschet', /Договор([^<]*)от/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Остаток на счете[\s\S]*?<div[^>]*class="\s*pl-tab-value\s*"[^>]*>([\S\s]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'chatles', /<div[^>]*pl-tab-value_chatles[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);

    if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
        html = AnyBalance.requestGet(baseurl + '/statistic/internet');
        getParam(html, result, 'trafficIn', /pl-stat-td_total_border(?:[\s\S]*?<td[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseTrafficGb);
        getParam(html, result, 'trafficOut', /pl-stat-td_total_border(?:[\s\S]*?<td[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseTrafficGb);
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

