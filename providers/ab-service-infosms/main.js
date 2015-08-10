/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и статистику на сервисе рассылки SMS сообщений http://www.infosmska.ru

Сайт оператора: http://www.infosmska.ru/
Личный кабинет: http://www.infosmska.ru/Pages/HttpApi.aspx
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

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://api.infosmska.ru/interfaces/getbalance.ashx";
    var html = AnyBalance.requestPost(baseurl, {
        login: prefs.login,
        pwd: prefs.password
    });

    if(/^Error:/i.test(html)){
        var error = html;
        throw new AnyBalance.Error(error);
    }

    var result = {success: true};

    getParam(html, result, 'balance', /(.*)/, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

