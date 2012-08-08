/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию по баллам на карте накопительной программы Малина.

Сайт бонусной программы: http://www.malina.ru
Персональная страница: http://catalog.malina.ru/login.php
*/


function getParamFind (result, param, obj, search_str, regexp, parser)
{
    if (!AnyBalance.isAvailable (param))
        return;

    if(typeof(regexp) == 'function' && !regexp.test){ //На андроид почему-то регэксп это тоже function, поэтому надо доп. проверить, что это не регэксп.
        parser = regexp;
        regexp = null;
    }

    var found = obj.find (search_str);
    if(found.size()){
        var res = found.text();
        if (regexp) {
            var matches = regexp.exec(res);
            if (matches)
                res = matches[0];
            else
                return;
        }
        
        result[param] = parser ? parser(res) : res;
    }
}

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

function main () {
    var prefs = AnyBalance.getPreferences ();
    var baseurl = 'http://catalog.malina.ru/';

    if (!prefs.login || prefs.login == '')
        throw new AnyBalance.Error ('Введите логин');

    if (!prefs.password || prefs.password == '')
        throw new AnyBalance.Error ('Введите пароль');

    AnyBalance.trace ('Trying to enter selfcare at address: ' + baseurl);
    AnyBalance.requestGet (baseurl);  // Запрос необходим для формирования cookie с регионом MSK
    var html = AnyBalance.requestPost (baseurl + 'login.php', {
        login: prefs.login,
        password: prefs.password
    });

    // Проверка неправильной пары логин/пароль
    var regexp=/id="alert"[\s\S]*?<p>(.*?)<\/p>/i;
    var res = regexp.exec (html);
    if (res) {
        res = res[1].replace ('Ошибка! ', '');
        throw new AnyBalance.Error (res);
    }

    // Проверка на корректный вход
    regexp = /\/logout.php/;
    if (regexp.exec(html))
    	AnyBalance.trace ('It looks like we are in selfcare...');
    else {
        AnyBalance.trace ('Have not found logout... Unknown error. Please contact author.');
        throw new AnyBalance.Error ('Неизвестная ошибка. Пожалуйста, свяжитесь с автором.');
    }

    AnyBalance.trace ('Parsing data...');
    
    matches = /id="account"[\s\S]*?(<table>[\s\S]*?<\/table>)/.exec (html);
    if (!matches)
        throw new AnyBalance.Error ('Невозможно найти информацию об аккаунте, свяжитесь с автором');

    var result = {success: true};
  
    //AnyBalance.trace(matches[1]);
    var $table = $(matches[1]);

    // Номер счета
    getParamFind (result, 'accountNumber', $table, 'tr:contains("Номер счета") td');

    // Владелец счета
    getParamFind (result, 'customer', $table, 'tr:contains("Владелец") td');

    // Статус счета
    getParamFind (result, 'status', $table, 'tr:contains("Статус счета") td');

    // Накоплено основных баллов
    getParamFind (result, 'mainPoints', $table, 'tr:contains("Накоплено основных баллов") td', parseBalance);

    // Накоплено EXPRESS-баллов
    getParamFind (result, 'expressPoints', $table, 'tr:contains("EXPRESS") td', parseBalance);

    // Израсходовано баллов
    getParamFind (result, 'gonePoints', $table, 'tr:contains("Израсходовано баллов") td', parseBalance);

    // Сгорело баллов
    getParamFind (result, 'burnPoints', $table, 'tr:contains("Сгорело баллов") td', parseBalance);

    // Баланс баллов
    getParamFind (result, 'balance', $table, 'tr:contains("Баланс баллов") td', parseBalance);

    // Доступно к оплате у партнеров
    getParamFind (result, 'availableForPay', $table, 'tr:contains("Доступно к оплате у партнеров") td', /\d+/, parseBalance);

    if (AnyBalance.isAvailable ('burnInThisMonth')) {

        AnyBalance.trace ('Fetching balance structure...');

        html = AnyBalance.requestGet (baseurl + 'personal/balance_structure.php');

        AnyBalance.trace ('Parsing balance structure...');
    
        matches = /<table\s*class="pure"[\s\S]*?<\/table>/.exec (html);
        if (matches) {
  
            var $table = $(matches[0]);

            // Аннулируемые в этом месяце баллы
            getParamFind (result, 'burnInThisMonth', $table, 'tr:nth-child(2) td:nth-child(2)', parseBalance);
        }
    }

    AnyBalance.requestGet (baseurl + 'logout.php');

    AnyBalance.setResult (result);
}
