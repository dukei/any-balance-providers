/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Лень карта ИОН

Сайт: http://i-on.ru/
Личный кабинет: http://i-on.ru/crm/logon
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

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function main(){
    var baseurl = "http://i-on.ru/crm/logon";
    var prefs = AnyBalance.getPreferences();
    
    var html = AnyBalance.requestPost(baseurl, {
        number:prefs.login,
        password:prefs.password,
        remember:false
    });

    if(!/\/crm\/logoff/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="validation-summary-errors"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Проверьте номер карты и пароль.");
    }

    var result = {success: true};
   
    getParam(html, result, 'balance', /Сейчас на вашей карте:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
//    getParam(html, result, 'new', /Будут скоро активированы ещё[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'total', /Всего было накоплено:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
//    getParam(html, result, 'off', /Всего было потрачено[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}

