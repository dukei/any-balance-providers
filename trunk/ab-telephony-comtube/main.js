 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

ComTube IP-телефония
Сайт оператора: https://www.comtube.com/
Личный кабинет: https://www.comtube.com/
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

var replaceTagsAndSpaces = [/&nbsp;/i, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
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

    var baseurl = 'https://www.comtube.com/';
    
    var info = AnyBalance.requestPost(baseurl + "index/auth_form?from=main_page_reg", {
        from:'main_page_reg',
        action:'auth',
        txtUserName:prefs.login,
        txtUserPass:prefs.password
    });

    var error = getParam(info, null, null, /"ajaxAuthFormErr"[^>]*>([\s\S]*?)<\//i, [/<.*?>/g, '', /^\s*|\s*$/g, '']);
    if(error)
        throw new AnyBalance.Error(error);
     
    var result = {
        success: true
    };

    getParam(info, result, 'balance', /login_balance_label[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, 'currency', /login_balance_label[^>]*>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(info, result, 'number', /(?:Ваш номер внутри|You number in) Comtube:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		
    AnyBalance.setResult(result);
}

