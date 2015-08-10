/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для томского интернет-провайдера FibreNET

Сайт оператора: http://fibrenet.ru
Личный кабинет: https://billing.fibrenet.ru
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
    if(val) val = Math.round(val*100)/100;
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseTrafficGb(str){
  var val = getParam(str.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
  return parseFloat((val/1024).toFixed(2));
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://7272829.ru/login.html";

    AnyBalance.setAuthentication(prefs.login, prefs.password);
    var html = AnyBalance.requestGet(baseurl);

    //AnyBalance.trace(html);
    if(!/historybalans/i.test(html))
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неправильный логин или пароль?');

    var result = {success: true};

    getParam(html, result, 'balance', /<b[^>]+id="balance"[^>]*>([\S\s]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /Доступ в интернет[\S\s]*?<br[^>]*>([\S\s]*?)<br[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'agreement', /Номер Договора:[\S\s]*?<b[^>]*>([\S\s]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Ваши тарифные планы:[\s\S]*?<b[^>]*>([\S\s]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

