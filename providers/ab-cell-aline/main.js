/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у оператора Элайн GSM (Марий Эл), ныне ростелеком.

Сайт оператора: http://www.aline-gsm.ru/
Личный кабинет: http://www.aline-gsm.ru/
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

    throw AnyBalance.Error('Этот провайдер больше не поддерживается в связи с поглощением Элайн GSM Ростелекомом. Для слежения за балансом пользуйтесь провайдером Ростелеком-Регионы', null, true);

    var baseurl = "http://rt-gsm.ru/index.php";

    AnyBalance.setDefaultCharset('utf-8');
    
    var html = AnyBalance.requestGet(baseurl);
    var param_return = getParam(html, null, null, /<input[^>]*name="return"[^>]*value="([^"]*)"/i);
    var matches = /<input[^>]*name="([a-z0-9]{32})"[^>]*value="([^"]*)"/i.exec(html);
    if(!matches || !param_return)
        throw new AnyBalance.Error("Не найдены параметры формы входа! Сайт изменен или проблемы на сайте. Проверьте, что можете войти на сайт вручную.");
    
    var hz_param = matches[1];
    var hz_param_value = matches[2];

    AnyBalance.trace("Trying to enter at address: " + baseurl);
    var params = {
        username:prefs.login,
        passwd:prefs.password,
        Submit:'Войти',
        option:'com_user',
        task:'login',
        'return':param_return
    };
    params[hz_param] = hz_param_value;

    var html = AnyBalance.requestPost(baseurl + "/component/user/", params);

//    AnyBalance.trace(html);
    
    if(!/<input[^>]+name="task"[^>]*value="logout"/i.test(html)){
        var error = getParam(html, null, null, /<dd[^>]*class="error message[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces);
        if(error)
          throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    
    var result = {success: true};

    getParam(html, result, 'balance', /Текущий баланс:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet', /Номер лицевого счета:([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'userName', /Добро пожаловать[\s\S]*?<br[^>]*>([^!<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /Тарифный план:([^<]*)/i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}
