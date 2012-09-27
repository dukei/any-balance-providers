/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для белорусского интернет-провайдера NetBerry

Сайт оператора: http://nbr.by
Личный кабинет: https://user.nbr.by/bgbilling/webexecuter
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

function parseTrafficTotalGb(str){
     var traffics = str.split(/\//g);
     var total;
     for(var i=0; i<traffics.length; ++i){
         var val = parseBalance(traffics[i]);
         if(typeof(val) != 'undefined')
             total = (total || 0) + val;
     }
     
     total = total && parseFloat((total/1024).toFixed(2));
     AnyBalance.trace('Parsed total traffic ' + total + ' Gb from ' + str);
     return total;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://user.nbr.by/bgbilling/webexecuter";

    var html = AnyBalance.requestPost(baseurl, {
        midAuth:0,
        user:prefs.login,
        pswd:prefs.password
    });

    //AnyBalance.trace(html);
    if(!/\?action=Exit/i.test(html)){
        var error = getParam(html, null, null, /<h2[^>]*>ОШИБКА:([\s\S]*?)(?:<\/ul>|<\/div>)/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};
    
    if(AnyBalance.isAvailable('balance')){
        html = AnyBalance.requestGet(baseurl + '?action=ShowBalance&mid=contract');
        getParam(html, result, 'balance', /Исходящий остаток[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }

    html = AnyBalance.requestGet(baseurl + '?action=ChangeTariff&mid=contract');
    getParam(html, result, '__tariff', /<td>Тарифный план[\s\S]*?<td><font>([\S\s]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('traffic_time', 'traffic_cost', 'traffic_total')){
        html = AnyBalance.requestGet(baseurl + '?action=ShowLoginsBalance&mid=6&module=dialup');
        
        getParam(html, result, 'traffic_time', /Итого:(?:[\S\s]*?<td[^>]*>){2}[\S\s]*?\[(\d+)\]/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'traffic_cost', /Итого:(?:[\S\s]*?<td[^>]*>){3}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'traffic_total', /Итого:(?:[\S\s]*?<td[^>]*>){4}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficTotalGb);
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

