/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у сотового оператора Ульяновск-GSM.

Сайт оператора: http://www.ulgsm-ncc.ru/
Личный кабинет: https://www.navigator.ul-gsm.ru/
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

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://www.navigator.ul-gsm.ru/";

    var html = AnyBalance.requestGet(baseurl + 'work.html');

    html = AnyBalance.requestPost(baseurl, {
        user_key:Math.random(),
        user_input_0:'_next',
        user_input_1:prefs.login,
        user_input_2:prefs.password,
        user_input_3:'AUTH'
    });

    var error = getParam(html, null, null, /<td[^>]+class="info_error_text"[^>]*>(.*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    var result = {success: true};

    var html = AnyBalance.requestPost(baseurl + 'work.html', {
        user_key:Math.random(),
        user_input_0:'_next',
        user_input_1:'STATUS'
    });
         
    getParam(html, result, 'balance', /&#1054;&#1089;&#1090;&#1072;&#1090;&#1086;&#1082;:[\s\S]*?<td[^>]*>([^<]*)/i, null, parseBalance);
    getParam(html, result, 'status', /&#1057;&#1090;&#1072;&#1090;&#1091;&#1089; &#1072;&#1073;&#1086;&#1085;&#1077;&#1085;&#1090;&#1072;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
//    getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    
    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

function parseBalance(text){
    text = text.replace(/\s+/, '');
    var val = getParam(text, null, null, /(-?\d[\d\.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}
