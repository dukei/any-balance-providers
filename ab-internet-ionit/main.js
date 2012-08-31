/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для северодвинского интернет-провайдера Ионит Телеком

Сайт оператора: http://www.ionitcom.ru
Личный кабинет: https://lk.ionitcom.ru
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

var replaceTagsAndSpaces = [/&nbsp;/g, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseTrafficGb(str){
  var val = getParam(str.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
  return parseFloat((val/1024).toFixed(2));
}

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://lk.ionitcom.ru/index.php";

    var html = AnyBalance.requestPost(baseurl, {
        'do':'login',
        type_auth: /^\d+$/i.test(prefs.login) ? 'ls' : 'login', //Если только цифры, то номер договора, если буквы есть, то логин
        login:prefs.login,
        password:prefs.password
    });

    //AnyBalance.trace(html);
    if(/<input[^>]*name="?do[^>]*value="?login_form/.test(html)){
        var error = getParam(html, null, null, /<form[\s\S]*?<td[^>]*tdgrey[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    html = AnyBalance.requestPost(baseurl, {'do':'users_info'});

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /Статус договора[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', /Лицевой счёт[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'agreement', /№ договора[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    html = AnyBalance.requestPost(baseurl, {'do':'users_services'});

    getParam(html, result, '__tariff', /Текущий тарифный план[\S\s]*?<td[^>]*>([\S\s]*?)<\/t[dr]>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

