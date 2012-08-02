/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у оператора интернет ТТК-Байкал.

Сайт оператора: http://kttk.ru/home-user/index.pl
Личный кабинет: https://asr.kttk.ru/
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

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/Задолженность/i, '-', /\s+/g, '', /,/g, '.'];

function parseTrafficGb(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    val = Math.round(val/1024*100)/100; //Перевели в Гб с двумя знаками после запятой
    AnyBalance.trace('Parsing traffic (' + val + ') from: ' + text);
    return val;
}

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://asr.kttk.ru";
    
    var html = AnyBalance.requestGet(baseurl);
    var login_name = getParam(html, null, null, /(login_remote\w+)/i);
    var pass_name = getParam(html, null, null, /(password_remote\w+)/i);

    if(!login_name || !pass_name)
      throw new AnyBalance.Error('Не удалось найти форму входа в личный кабинет!');

    var params = {
        hk3fwv: 0,
        kk3fwv: true,
        redirect: '',
        'action.remote_login.lf3fwv.x':26,
        'action.remote_login.lf3fwv.y':5
    };

    params[login_name] = prefs.login;
    params[pass_name] = prefs.password;

    var html = AnyBalance.requestPost(baseurl + '/login', params);

    var error = getParam(html, null, null, /<font [^>]*class="error"[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    var result = {success: true};

    getParam(html, result, 'userName', /<!-- Наименование клиента -->[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', /Договор (\d+) от/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Итого на [\s\S]*?<td[^>]*><b>([^<]*)/i, replaceTagsAndSpaces, parseBalance);

    var href = getParam(html, null, null, /<a href=["']([^'"]+)["'][^>]*>\s*услуги\s*<\/a>/i);
    if(!href)
        AnyBalance.trace('Не удалось найти ссылку на услуги');
    if(href){
	html = AnyBalance.requestGet(baseurl + href);
        href = getParam(html, null, null, /<a href=["']([^'"]+)["'][^>]*>\s*Услуга IP\s*<\/a>/i);
        if(!href)
            AnyBalance.trace('Не удалось найти ссылку на услугу IP');
        if(href){
	    html = AnyBalance.requestGet(baseurl + href);
            getParam(html, result, '__tariff', /<a[^>]*href=["'][^'"]+&columnNumber=2["'][^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
            if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
                href = getParam(html, null, null, /<a href=["']([^'"]+&columnNumber=1)["'][^>]*/i);
                if(!href)
                   AnyBalance.trace('Не удалось найти ссылку на трафик');
                if(href){
                    html = AnyBalance.requestGet(baseurl + href);
                    getParam(html, result, 'trafficIn', /Итого:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
                    getParam(html, result, 'trafficOut', /Итого:(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
                }
            }
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

