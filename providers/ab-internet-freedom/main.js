/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у воронежского оператора интернет FreeDom.

Сайт оператора: http://freedom-vrn.ru/
Личный кабинет: https://statserv.freedom-vrn.ru/
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

function getTrafficGb(str){
  return parseFloat((parseFloat(str)/1024/1024/1024).toFixed(2));
}

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://statserv.freedom-vrn.ru/";

    var html = AnyBalance.requestPost(baseurl + 'login.jsp', {
	login: prefs.login,
	pwd: prefs.password,
	'exec': 'Отправить'
    });

    var entered = getParam(html, null, null, /(logout\.jsp)/i);
    if(!entered){
        var error = getParam(html, null, null, /<font color="red">([\s\S]*?)<\/font>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет (свяжитесь с автором провайдера для исправления проблемы)');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /<span[^>]*class="cbalance"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet', /Код лицевого счета:\s*([\w\d]+)/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /Текущий расчетный период[\s\S]*?<tr class="fi[rs]{2}t">[\s\S]*?<td[^>]*>[\s\S]*?<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'status', /Текущий расчетный период[\s\S]*?<tr class="fi[rs]{2}t">[\s\S]*?(?:<td[^>]*>[\s\S]*?<\/td>\s*){4}<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

    getParam(html, result, 'discount', /Следующий расчетный период[\s\S]*?<tr class="fi[rs]{2}t">[\s\S]*?(?:<td[^>]*>[\s\S]*?<\/td>\s*){2}<td[^>]*>([\s\S]*?)<\/td>/i, replaceFloat, parseFloat);
    getParam(html, result, 'abonentka', /Следующий расчетный период[\s\S]*?<tr class="fi[rs]{2}t">[\s\S]*?(?:<td[^>]*>[\s\S]*?<\/td>\s*){3}<td[^>]*>([\s\S]*?)<\/td>/i, replaceFloat, parseFloat);
    
    AnyBalance.setResult(result);
}
