/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Nonoh FREE.VOIP.CALLS IP-телефония
Сайт оператора: http://www.nonoh.net
Личный кабинет: https://www.nonoh.net/login/
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


function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');    

    var baseurl = 'https://www.nonoh.net/';
    
    var html = AnyBalance.requestGet(baseurl + "login");
    var matches = /<input[^>]+name="([0-9a-f]{32})"[^>]*value="([0-9a-f]{32})"[^>]*>/i.exec(html);
    if(!matches)
        throw new AnyBalance.Error("Не удаётся найти идентификатор сессии! Свяжитесь с автором провайдера.");

    var params = {
	'login[username]':prefs.login,
	'login[password]':prefs.password,
        page_referrer: 'login'
    };
    params[matches[1]] = matches[2];

    var info = AnyBalance.requestPost(baseurl + "login", params);

    var error = getParam(info, null, null, /<div class="row_error_message error">([\s\S]*?)<\/div>/i, [/<.*?>/g, '', /^\s*|\s*$/g, '']);
    if(error)
        throw new AnyBalance.Error(error);

    error = getParam(info, null, null, /(service is temporarily unavailable)/i);
    if(error){
        //Какой-то глюк с 503 ошибкой, а баланс вроде бы выдаётся по другому адресу.
        info = AnyBalance.requestGet(baseurl + "buy_credit2/");
    }

    error = getParam(info, null, null, /(service is temporarily unavailable)/i);
    if(error) //Попытка не помогла, возвращаем ошибку
        throw new AnyBalance.Error("К сожалению, сайт временно недоступен. Попробуйте позднее."); 
     
    var result = {
        success: true
    };

    var matches;

    getParam(info, result, 'balance', /Your credit:[\s\S]*?<span[^>]*>[^<]*?(-?\d[\d\s\.,]*)/i, replaceFloat, parseFloat);
    getParam(info, result, 'freedays', /Freedays:[\s\S]*?<span[^>]*>(\d+)/i, replaceFloat, parseFloat);
    getParam(info, result, 'autorecharge', /Automatic recharge:([\s\S]*?)</i, replaceTagsAndSpaces);
    getParam(info, result, 'notifications', /(\d+)\s*Notifications/i, replaceFloat, parseFloat);

    result.__tariff = prefs.login;
		
    AnyBalance.setResult(result);
}

