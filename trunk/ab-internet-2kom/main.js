/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у московского интернет-провайдера 2kom.

Сайт оператора: http://2kom.ru/
Личный кабинет: https://portal.2kom.ru/lk/
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

    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://portal.2kom.ru/";

    var html = AnyBalance.requestPost(baseurl + "login.php", {
        login: prefs.login,
        password: prefs.password,
        r: '',
        p: ''
    }, {'Referer': baseurl + 'login.php'});

    //AnyBalance.trace(html);

    var error = getParam(html, null, null, /var login_error\s*=\s*'([^']*)/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    html = AnyBalance.requestGet(baseurl + "lk/");

    var result = {success: true};

    getParam(html, result, 'balance', />\s*Баланс[\s\S]*?>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'userName', /<label>Абонент\s*(.*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', /<label>№ договора\s*(.*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /<label>Тариф\s*(.*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'status', /<label>Состояние\s*(.*)/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
        var href = getParam(html, null, null, /<a[^>]*href="(lk\/stat.php[^"]*)/i);
        if(href){
            html = AnyBalance.requestGet(baseurl + href);
            AnyBalance.trace(html);
            
            getParam(html, result, 'trafficIn', /<tr class="current">(?:[\s\S]*?<td[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, parseTrafficGb);
            getParam(html, result, 'trafficOut', /<tr class="current">(?:[\s\S]*?<td[^>]*>){5}([^<]*)/i, replaceTagsAndSpaces, parseTrafficGb);
        }else{
            AnyBalance.trace("Can not find statistics url!");
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

