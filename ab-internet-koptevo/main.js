/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Данные по московскому интернет провайдеру Koptevo.net. Основными районами предоставления услуг 
доступа в интернет являются район Коптево, Войковский (м. Войковская), Тимирязевский 
(м. Тимирязевская), Печатники (м. Печатники).

Сайт оператора: http://www.koptevo.net
Личный кабинет: https://cp.koptevo.net/
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

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseTrafficGb(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    val = Math.round(val/1024*100)/100; //Перевели в Гб с двумя знаками после запятой
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://cp.koptevo.net/";
    AnyBalance.setDefaultCharset('windows-1251');

    html = AnyBalance.requestPost(baseurl, {
      _action: 'login',
      flogin_name:prefs.login,
      flogin_pwd:prefs.password
    });

    var error = getParam(html, null, null, /<div[^>]*color:\s*red[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс:[\s\S]*?<span[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /Интернет:[\s\S]*?<span[^>]*>([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /Текущий тариф:([\s\S]*?)<br/i, replaceTagsAndSpaces);

    if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
        html = AnyBalance.requestGet(baseurl + 'traffic.php');
        getParam(html, result, 'trafficIn', /Всего(?:[^<>]*<\/th><th[^<>]*>){4}([^<]*)/i, replaceTagsAndSpaces, parseTrafficGb);
        getParam(html, result, 'trafficOut', /Всего(?:[^<>]*<\/th><th[^<>]*>){5}([^<]*)/i, replaceTagsAndSpaces, parseTrafficGb);
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

