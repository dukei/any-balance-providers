/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у калининградского оператора интернет Диалог.

Сайт оператора: http://tis-dialog.ru/
Личный кабинет: https://stats.tis-dialog.ru
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

var replaceFloat = [/\s+/g, '', /,/g, '.'];

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "http://habrahabr.ru/users/";

    var html = AnyBalance.requestGet(baseurl + prefs.login);

    var error = getParam(html, null, null, /(страница не найдена \(404\))/i);
    if(error)
        throw new AnyBalance.Error("Хабрапользователь " + prefs.login + " не найден. Проверьте имя!");

    var result = {success: true};

    getParam(html, result, 'karma', /<div class="score"[^>]*>[\s\S]*?<div class="num"[^>]*>(-?\d[\d\s\.,]*)/i, replaceFloat, parseFloat);
    getParam(html, result, 'rating', /<div class="rating"[^>]*>[\s\S]*?<div class="num"[^>]*>(-?\d[\d\s\.,]*)/i, replaceFloat, parseFloat);
    getParam(html, result, 'votes', /<div class="votes"[^>]*>(-?\d[\d\s\.,]*)/i, replaceFloat, parseFloat);
    result.__tariff = prefs.login;
    
    AnyBalance.setResult(result);
}

