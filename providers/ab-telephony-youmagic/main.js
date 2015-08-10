/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

YouMagic IP-телефония
Сайт оператора: https://www.youmagic.com
Личный кабинет: https://www.youmagic.com/ru/cabinet
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

    var baseurl = 'https://www.youmagic.com/';
    
    var html = AnyBalance.requestGet(baseurl + "ru/cabinet");
    var matches = /<input[^>]+name="([0-9a-f]{32})"[^>]*value="([^"]*)"[^>]*>/i.exec(html);
    if(!matches)
        throw new AnyBalance.Error("Не удаётся найти идентификатор сессии! Свяжитесь с автором провайдера.");

    var params = {
	username:prefs.login,
	passwd:prefs.password,
        option: 'com_portabillinguser',
        task: 'login',
        view: 'login',
        'return': getParam(html, null, null, /<input[^>]+name="return"[^>]*value="([^"]*)"/i),
    };
    params[matches[1]] = matches[2];

    html = AnyBalance.requestPost(baseurl + "/ru/component/portabillinguser/login", params);

    if(!/name="task"[^>]*value="logout"/i.test(html)){
        var error = getParam(html, null, null, /<dd class="error[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }
     
    var result = {
        success: true
    };

    var matches;

    getParam(html, result, 'userName', /(?:Здравствуйте|Hi),[\s\S]*?>(.*?)</i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /<b[^>]+id="ac_balance"[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /(?:Тариф|Tariff):[\s\S]*?<\/span[^>]*>([\s\S]*?)</i, replaceTagsAndSpaces);
    getParam(html, result, 'number', /number-icon[\s\S]*?>([\s\S]*?)</i, replaceTagsAndSpaces);
		
    AnyBalance.setResult(result);
}

