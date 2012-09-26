/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс, кредит, номер лицевого счета для Электростальского провайдера интернет, телевидения и телефонии Твоё ТВ.

Сайт оператора: http://eltv.ru
Личный кабинет: https://stat.eltv.ru/
*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var value = regexp.exec (html);
	if (value) {
		value = value[0];
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

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function main(){
	var prefs = AnyBalance.getPreferences();

	var baseurl = "https://stat.eltv.ru/"; 
	AnyBalance.trace('connect '+baseurl);

	var html = AnyBalance.requestPost(baseurl , {
        	login: prefs.login,
	        password: prefs.password,
        	submit: 'Продолжить'
		});

	//Проверим, что есть ссылка на выход, это значит, что мы зашли в кабинет
        if(!/\/logout/i.test(html)){ 
            //Если ссылки нет, то надо выдать ошибку.
            //Сначала пытаемся найти текстовое описание
            var error = getParam(html, null, null, /<p[^>]+style=['"][^'"]*color:red[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
    	    if(error)
	        throw new AnyBalance.Error(error);
            throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
        }

	AnyBalance.trace('trying to find data');

	var result = {success: true};

	getParam(html, result, 'balance', /Баланс<\/td>\n<td[^>]*>([\s\S]*?)<\/td>/i,replaceTagsAndSpaces, parseBalance);

	getParam(html, result, 'ls', /Основной лицевой счет<\/td>\n<td[^>]*>([\s\S]*?)<\/td>/i,replaceTagsAndSpaces);

	getParam(html, result, 'credit', /Кредит<\/td>\n<td[^>]*>([\s\S]*?)<\/td>/i,replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
}
