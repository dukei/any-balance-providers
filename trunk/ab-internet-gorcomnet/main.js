/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у московского оператора интернет Горком.

Сайт оператора: http://gorcomnet.ru/
Личный кабинет: https://statistics.gorcomnet.ru:7778/
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

function parseBalance(str){
    var val = parseFloat(str);
    if(isNaN(val))
        val = 0;
    return val;
}

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://statistics.gorcomnet.ru:7778/";
    var html = AnyBalance.requestPost(baseurl + 'login.jsp', {
        p_logname: prefs.login,
        p_pwd: prefs.password
    });

    var error = getParam(html, null, null, /<p[^>]*class=['"]hi['"][^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    var result = {success: true};

    if(AnyBalance.isAvailable('balance')){
        var integer = getParam(html, null, null, /Баланс[\s\S]*?<td[^>]+class="integer"[^>]*>(-?\d[\d\.,\s]*)/i, replaceFloat, parseFloat) || 0; 
        var frac = getParam(html, null, null, /Баланс[\s\S]*?<td[^>]+class="frac"[^>]*>(-?\d[\d\.,\s]*)/i, replaceFloat, parseFloat) || 0;
        result.balance = integer + frac/100;
    }

    getParam(html, result, 'licschet', /Лицевой счет([^<]*)</i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'credit', /Кредит[\s\S]*?<td[^>]*>([^<]*)/i, replaceFloat, parseBalance);
    getParam(html, result, 'expences', /Расходы в текущем месяце[\s\S]*?<td[^>]*>([^<]*)/i, replaceFloat, parseBalance);
    getParam(html, result, '__tariff', /Ваш тарифный план[^>]*&laquo;([^>]*)&raquo;/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
        html = AnyBalance.requestGet(baseurl + 'stat.jsp');
        getParam(html, result, 'trafficIn', /Входящий Internet трафик[\s\S]*?<td[^>]*>([^<]*)/i, replaceFloat, parseBalance);
        getParam(html, result, 'trafficOut', /Исходящий Internet трафик[\s\S]*?<td[^>]*>([^<]*)/i, replaceFloat, parseBalance);
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

