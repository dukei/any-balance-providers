 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Ростелком-волга (Нижний Новгород) Телефония
Сайт оператора: http://www.nnovgorod.volga.rt.ru/
Личный кабинет: http://navigator.nnov.volga.rt.ru/navigator/

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
	throw new AnyBalance.Error('Сайт более недоступен, установите провайдер Ростелеком (Единый кабинет)');
	
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');    

    var baseurl = "http://navigator.nnov.volga.rt.ru/navigator/";
    
    var html = AnyBalance.requestPost(baseurl + 'login.php', {
        LoginCity:prefs.prefix,
        LoginNumber:prefs.login,
        LoginPasswd:prefs.password,
        LoginAccept:'Ido'
    });

    if(!/Выйти из системы/i.test(html)){   
        var error = getParam(html, null, null, /alert\s*\(\s*"([^"]*)/i, [/(?:\\r)?\\n/g, '\n']);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }
    
    var result = {success: true};

    var matches;

    getParam(html, result, 'userName', /<input[^>]+value="([^"]*)"[^>]*name="fullname"/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('licschet')){
        var ls_region = getParam(html, null, null, /<input[^>]+value="([^"]*)"[^>]*name="region"/i, replaceTagsAndSpaces, html_entity_decode);
        var ls_prefix = getParam(html, null, null, /<input[^>]+value="([^"]*)"[^>]*name="prefix"/i, replaceTagsAndSpaces, html_entity_decode);
        var ls_account = getParam(html, null, null, /<input[^>]+value="([^"]*)"[^>]*name="account"/i, replaceTagsAndSpaces, html_entity_decode);
        result.licschet = '' + ls_region + '-' + ls_prefix + '-' + ls_account;
    }
		
    html = AnyBalance.requestGet(baseurl + 'set_check.php');
    var month = getParam(html, null, null, /<select[^>]*name="month">\s*<option[^>]*value=["']?(\d+)/i);
    var year = getParam(html, null, null, /<select[^>]*name="year">\s*<option[^>]*value=["']?(\d+)/i);
    
    var html = AnyBalance.requestPost(baseurl + 'check.php', 
        'code=&phone=&fullname=&address=&region=&prefix=&account=&month=' + month + '&year=' + year + '&CheckSubmit=%D1%F7%E5%F2&ServiceType=',
        {'Content-Type': 'application/x-www-form-urlencoded'});

    getParam(html, result, 'balance', /Остаток:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'expences', /Начислено:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'peni', /Пени:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'overpay', /ПЕРЕПЛАТА:[\s\S]*?<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /CheckTable[\s\S]*?Тарифный план[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    if(AnyBalance.isAvailable('period'))
        result.period = month + '/' + year;

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

