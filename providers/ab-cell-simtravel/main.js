 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

SimTravel Мобильная связь за границей
Сайт оператора: http://www.sim-travel.ru
Личный кабинет: http://www.sim-travel.ru/account/private/
*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var value = regexp ? regexp.exec (html) : [html, html];
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

function parseCurrency(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(\S*?)-?\d/);
    AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    if(prefs.num && !/^\d{10,}$/.test(prefs.num))
        throw new AnyBalance.Error("Введите номер телефона, по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому номеру.");

    AnyBalance.setDefaultCharset('utf-8');    

    var baseurl = 'http://www.simtravel.ru/abonents/';
    
    var html = AnyBalance.requestPost(baseurl, {
        option:'do_login',
        email:prefs.login,
        password:prefs.password
    });

    if(!/option=logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]*class="errMessage[^>]*>([\s\S]*?)<\/div>/i);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Проверьте логин/пароль");
    }

    var result = {
        success: true
    };

    var num = prefs.num ? prefs.num : '\\d{10,}';
    var ref = getParam(html, null, null, new RegExp('(\\?option=balance&sim=' + num + ')', 'i'));
    if(!ref)
        throw new AnyBalance.Error(prefs.num ? 'Не найдена сим-карта с номером ' + prefs.num : 'Не найдено ни одной сим-карты');

    html = AnyBalance.requestGet(baseurl + ref);

    getParam(html, result, 'balance', /Баланс сим-карты[\s\S]*?&mdash;([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'currency', /Баланс сим-карты[\s\S]*?&mdash;([^<]*)/i, replaceTagsAndSpaces, parseCurrency);
    getParam(html, result, 'number', /Баланс сим-карты([\s\S]*?)&mdash;/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /Баланс сим-карты([\s\S]*?)&mdash;/i, replaceTagsAndSpaces);
		
    AnyBalance.setResult(result);
}

