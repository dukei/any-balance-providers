 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Skype IP-телефония
Сайт оператора: http://www.skype.com/
Личный кабинет: https://www.skype.com/

Не отлаживается в AnyBalanceDebugger из-за бага в webkit: 
http://code.google.com/p/chromium/issues/detail?id=96136
*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && !AnyBalance.isAvailable (param))
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

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}


var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var _text = html_entity_decode(text.replace(/\s+/, ''));
    var val = getParam(_text, null, null, /(-?\d[\d\.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');    
    
    AnyBalance.requestGet("https://login.skype.com/account/login-form");

    var info = AnyBalance.requestPost("https://login.skype.com/account/login-form", {
	username:prefs.login,
	password:prefs.password
    });

    var error = getParam(info, null, null, /<div class="messageBody[^>]*>([\s\S]*?)<\/div>/i, [/<.*?>/g, '', /^\s*|\s*$/g, '']);
    if(error)
        throw new AnyBalance.Error(error);
     
    
    var result = {
        success: true
    };

    var matches;

    getParam(info, result, 'balance', /id="balanceAmount">([\s\S]*?)<div/i, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, 'currency', /<span class='ccy'>([^<]*)/i, null, html_entity_decode);
		
    AnyBalance.setResult(result);
}

