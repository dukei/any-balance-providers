/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры счетов транс кредит банка через интернет банк.

Сайт оператора: http://tcb.ru
Личный кабинет: https://i.tcb.ru
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

var replaceTagsAndSpaces = [/&nbsp;/g, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
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

function parseDate(str){
    AnyBalance.trace('Parsing date from value: ' + str);
    var matches = /(\d+)[^\d](\d+)[^\d](\d+)/.exec(str);
    var time;
    if(matches){
	  time = (new Date(+matches[3], matches[2]-1, +matches[1])).getTime();
    }
    return time;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://i.tcb.ru";
    AnyBalance.setDefaultCharset("utf-8");
    
    if(prefs.num && !/^\d{20}$/.test(prefs.num))
        throw new AnyBalance.Error("Введите полный номер счета (20 цифр) или не вводите ничего, чтобы показать информацию по первому счету");

    var html = AnyBalance.requestGet(baseurl);
    var href = getParam(html, null, null, /<form[^>]*action="([^"]*)"[^>]*name="mainForm"/i);
    if(!href)
        throw new AnyBalance.Error("Не удалось найти форму входа. Обратитесь к автору провайдера.");

    html = AnyBalance.requestPost(baseurl + href, {
        j_security_check:'csp.logon.apply',
        j_username:prefs.login,
        jfull_username:prefs.login,
        j_password:prefs.password
    });

    var error = getParam(html, null, null, /<font[^>]color="red"[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces);
    if(error)
        throw new AnyBalance.Error(error);

    html = AnyBalance.requestGet(baseurl + "/pie/privateAccountBalance");

    var accInfo = getParam(html, null, null, new RegExp('\\/user\\/privateAccountProperties\\/view\\?accountNumb=(' + (prefs.num || '') + '(?:[\\s\\S]*?<\\/tr>){2})', 'i'));
    if(!accInfo){
        if(prefs.num)
            throw new AnyBalance.Error('Не удалось найти счета ' + prefs.num);
        else
            throw new AnyBalance.Error('Не удалось найти ни одного счета!');
    }

    var result = {success: true};

    getParam(accInfo, result, 'accnum', /(\d{20})/);
    getParam(accInfo, result, '__tariff', /<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(accInfo, result, 'accname', /<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(accInfo, result, 'balance', /(?:[\s\S]*?<td[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(accInfo, result, 'available', /<td[^>]*colspan="4"[^>]*>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'total', /<th>ИТОГО:(?:[\s\S]*?<th[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    
    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

