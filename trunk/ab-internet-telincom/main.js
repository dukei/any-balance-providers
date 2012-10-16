/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для московского интернет-провайдера telincom

Сайт оператора: http://www.telincom.ru
Личный кабинет: http://stat.telincom.ru/site/
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

    var baseurl = "http://stat.telincom.ru/site/stat.php";

    var html = AnyBalance.requestPost(baseurl, {
        cmd: 'login',
        login:prefs.login,
        password:prefs.password
    });

    //AnyBalance.trace(html);
    if(!/stat.php\?cmd=logout/.test(html)){
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неверный логин-пароль?');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credit', /Кредит:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /Статус Интернета:[\S\s]*?<td[^>]*>([\S\s]*?)(?:<a[^>]*>|<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', /Л\/С:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);

    getParam(html, result, '__tariff', />Название<[\s\S]*?<td[^>]*class=['"]utm-table[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
        var sid = getParam(html, null, null, /SID=([a-f0-9]{32})/i);
        if(!sid){
            AnyBalance.trace('Не удаётся получить идентификатор сессии, трафик пропускаем...');
        }else{
            html = AnyBalance.requestGet(baseurl + '?cmd=u_traff&SID='+sid);
            getParam(html, result, 'trafficIn', /ИТОГО(?:[\s\S]*?<td[^>]*>)([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
            getParam(html, result, 'trafficOut', /ИТОГО(?:[\s\S]*?<td[^>]*>){2}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
        }
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

