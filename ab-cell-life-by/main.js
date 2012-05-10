/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Life:) — GSM оператор мобильной связи Белоруссия.
Сайт оператора: http://www.life.com.by/
Интернет Система Самообслуживания Абонентов (ИССА): https://my.life.com.by/
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

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://issa.life.com.by/';
    var matches = prefs.login.match(/^(\d\d)(\d{7})$/);
    if(!matches)
        throw new AnyBalance.Error('Пожалуйста, введите 9 последних цифр номера телефона (без префикса +375) без пробелов и разделителей.');
        
    var html=AnyBalance.requestPost(baseurl, {
        Code: matches[1],
        Phone: matches[2],
        password: prefs.password
    });
        
    var error = getParam(html, null, null, /<div class="validation-summary-errors errorMessage">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    if(error)
        throw new AnyBalance.Error(error);

    var result = {
        success: true
    };
    getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Текущий основной баланс:[\s\S]*?<div[^>]*>\s*(-?\d[\d\., \s]*)/i, replaceFloat, parseFloat);
    getParam(html, result, 'balance_bonus', /Текущий бонусный баланс:[\s\S]*?<div[^>]*>\s*(-?\d[\d\., \s]*)/i, replaceFloat, parseFloat);

    AnyBalance.setResult(result);
}