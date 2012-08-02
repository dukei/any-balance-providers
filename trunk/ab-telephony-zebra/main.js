 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Zebra Telecom Телефония
Сайт оператора: http://www.zebratelecom.ru
Личный кабинет: http://www.zebratelecom.ru/cabinet/

*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var value = regexp ? regexp.exec (html) : html;
	if (value) {
                if(regexp)
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
var replaceFloat = [/\s+/g, '', /,/g, '.', /(\d)\-(\d)/g, '$1.$2'];

function parseBalance(text){
    var _text = text.replace(/\s+/g, '');
    var val = getParam(_text, null, null, /(-?\d[\d\.,\-]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseCurrency(text){
    var _text = text.replace(/\s+/g, '');
    var val = getParam(_text, null, null, /[\d\.,\-]+(\S*)/);
    AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');    

    var baseurl = "http://www.zebratelecom.ru/private_clients/cabinet/check.php";
    
    var html = AnyBalance.requestPost(baseurl, {
        fname:'auth',
	login:prefs.login,
	pass:prefs.password
    });

    var error = getParam(html, null, null, /<p[^>]*style="color:\s*red;"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
    if(error)
        throw new AnyBalance.Error(error);
    
    var result = {
        success: true
    };

    var matches;

    getParam(html, result, 'balance', /<a[^>]*id="mcount"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'currency', /<a[^>]*id="mcount"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseCurrency);
    getParam(html, result, 'userName', /Пользователь:([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'licschet', /№ счета:([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /Пользователь:([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		
    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

