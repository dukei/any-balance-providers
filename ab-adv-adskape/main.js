/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию у сервиса медийной рекламы AdSkape

Сайт оператора: http://adskape.ru
Личный кабинет: http://adskape.ru
*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var matches = regexp.exec (html), value;
	if (matches) {
		value = matches[1];
		if (replaces) {
			for (var i = 0; i < replaces.length; i += 2) {
				value = value.replace (replaces[i], replaces[i+1]);
			}
		}
		if (parser)
			value = parser (value);

    if(param)
      result[param] = value;
	}
   return value
}

var replaceTagsAndSpaces = [/&nbsp;/g, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');

    var baseurl = "http://adskape.ru/";

    var html = AnyBalance.requestPost(baseurl + 'login.php', {
        l:prefs.login,
        p:prefs.password
    });

    //AnyBalance.trace(html);
    if(!/logout.php/.test(html)){
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неправильный логин-пароль?');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Ваш баланс:([^<]*)/i, replaceTagsAndSpaces, parseBalance);

    getParam(html, result, 'uniqueShow', /<td[^>]*>Итого(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'uniqueShowPaid', /<td[^>]*>Итого(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'nonUniqueShow', /<td[^>]*>Итого(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'uniqueShowClickPaid', /<td[^>]*>Итого(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'clicksTotal', /<td[^>]*>Итого(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'clicksTotalPaid', /<td[^>]*>Итого(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'ctr', /<td[^>]*>Итого(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'paid', /<td[^>]*>Итого(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

