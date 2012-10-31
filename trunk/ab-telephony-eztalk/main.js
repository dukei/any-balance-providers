 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

EZtalk — дешевая дальняя связь с мобильного
Сайт оператора: http://eztalk.ru
Личный кабинет: http://cabinet.eztalk.ru

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

var replaceTagsAndSpaces = [/&nbsp;/ig, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
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

    var baseurl = "http://cabinet.eztalk.ru/eztalk/";
    
    var html = AnyBalance.requestPost(baseurl + 'login.action', {
        selectedPage:'',
	phone:prefs.login,
	password:prefs.password
    });

    if(!/\?page=logout/i.test(html)){
        var error = getParam(html, null, null, /<span[^>]*class=["']error[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }
    
    var result = {
        success: true
    };

    getParam(html, result, 'pin', /.>\s*PIN(?:\s|&nbsp;)*<[\s\S]*?value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'phone', /(?:Phone number|Номер телефона)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /(?:Current account balance|Баланс на текущий период)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'notif', /(?:Allow information messages|Получать информационные сообщения)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'roaming', /(?:"Roaming" function|Функция "роуминг")[\s\S]*?<td[^>]*>([\s\S]*?)(?:<\/td>|\()/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /(?:Current rate plan|Текущий тарифный план)[\s\S]*?<td[^>]*>([\s\S]*?)(?:<\/td>|\()/i, replaceTagsAndSpaces, html_entity_decode);
		
    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

