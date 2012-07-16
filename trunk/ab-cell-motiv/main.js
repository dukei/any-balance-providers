/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у оператора Мотив (Пермь, Екатеринбург).

Сайт оператора: http://motivtelecom.ru
Личный кабинет: https://lisa.motivtelecom.ru
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

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://lisa.motivtelecom.ru/";

    AnyBalance.setDefaultCharset('utf-8');

    AnyBalance.trace("Trying to enter lisa at address: " + baseurl);
    var html = AnyBalance.requestPost(baseurl, {
        logintype:prefs.logintype || 1,
        abnum:prefs.login,
        pass:prefs.password,
        x:57,
        y:18
    }, {'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11'});

//    AnyBalance.trace(html);
    
    var error = getParam(html, null, null, /<div[^>]*class="errmsg"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    if(error)
      throw new AnyBalance.Error(error);
    
    var result = {success: true};

    getParam(html, result, 'balance', /Баланс:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'userName', /Пользователь:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'tarification', /Тарификация:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'phone', /Номер телефона:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}
