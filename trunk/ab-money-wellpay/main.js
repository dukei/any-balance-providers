/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и номер счета Яндекс.Деньги

Сайт оператора: http://money.yandex.ru/
Личный кабинет: https://money.yandex.ru/
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

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    
    AnyBalance.setDefaultCharset('utf-8');

    if(!prefs.login)
        throw new AnyBalance.Error("Введите номер телефона!");
    if(!prefs.password)
        throw new AnyBalance.Error("Введите пароль!");

    var baseurl = "https://my.wellpay.ru";

    html = AnyBalance.requestPost(baseurl + '/', {
      username: prefs.login,
      password:prefs.password,
      params:'1680|1050|32|null|+04',
      submit:'Открыть кошелек'
    }, {
      Origin:baseurl,
      Referer:baseurl + '/',
      'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.79 Safari/537.1'
    });

    if(!/\/logout\//i.test(html)){
        var error = getParam(html, null, null, /error-message"[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось зайти. Проверьте логин и пароль.");
    }

    var result={success: true};

    getParam(html, result, 'balance', /"purse-total"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'number', /"purse-number"[^>]*>(.*?)</i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /"purse-number"[^>]*>(.*?)</i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}
