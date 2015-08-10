 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Voip Discount IP-телефония
Сайт оператора: http://www.voipdiscount.com
Личный кабинет: https://www.voipdiscount.com

Не отлаживается в AnyBalanceDebugger из-за бага в webkit: 
http://code.google.com/p/chromium/issues/detail?id=96136
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

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');    

    var baseurl = 'https://www.voipdiscount.com/';
    
    var html = AnyBalance.requestGet(baseurl + "login");
    var matches = /<input[^>]+name="([0-9a-f]{32})"[^>]*value="([0-9a-f]{32})"[^>]*>/i.exec(html);
    if(!matches)
        throw new AnyBalance.Error("Не удаётся найти идентификатор сессии! Свяжитесь с автором провайдера.");

    var params = {
	'login[username]':prefs.login,
	'login[password]':prefs.password
    };
    params[matches[1]] = matches[2];

    var info = AnyBalance.requestPost(baseurl + "login", params);

    var error = getParam(info, null, null, /<div class="row_error_message error">([\s\S]*?)<\/div>/i, [/<.*?>/g, '', /^\s*|\s*$/g, '']);
    if(error)
        throw new AnyBalance.Error(error);
     
    var result = {
        success: true
    };

    var matches;

    getParam(info, result, 'balance', /<span[^>]*class="balance"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, 'freedays', /<span[^>]*class="freedays"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    result.__tariff = prefs.login;
		
    AnyBalance.setResult(result);
}

