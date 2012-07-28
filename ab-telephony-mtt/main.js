/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

MTT IP-телефония
Сайт оператора: http://www.mtt.ru
Личный кабинет: http://www.mtt.ru/sc
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

var replaceTagsAndSpaces = [/&nbsp;/ig, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

function parseBalance(text){
    text = text.replace(/\s+|&nbsp;/ig, '');
    var val = getParam(text, null, null, /(-?\d[\d\.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');    

    var baseurl = 'http://www.mtt.ru/';
    
    var html = AnyBalance.requestGet(baseurl + "user/login?destination=sc");
    var form_build_id = getParam(html, null, null, /<input[^>]+name="form_build_id"[^>]*value="([^"]*)"[^>]*>/i);
    if(!form_build_id)
        throw new AnyBalance.Error("Не удаётся найти идентификатор формы для входа! Свяжитесь с автором провайдера.");

    var params = {
	name:prefs.login,
	pass:prefs.password,
        form_build_id:form_build_id,
        form_id:'user_login',
        op:'Войти'
    };
        
    html = AnyBalance.requestPost(baseurl + "user/login?destination=sc", params);

    var error = getParam(html, null, null, /<div[^>]*class="messages error"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);
     
    var result = {
        success: true
    };

    getParam(html, result, 'licschet', /<a [^>]*class="active"[^>]*>л\/с\s*(\d+)/i);
    getParam(html, result, 'balance', /Баланс:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'userName', /Добрый день,[\s\S]*?>(.*?)</i, replaceTagsAndSpaces);
		
    AnyBalance.setResult(result);
}

