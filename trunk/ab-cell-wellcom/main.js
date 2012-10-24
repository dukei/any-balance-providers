/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для томского сотового оператора WellCom (Ростелеком, Томский филиал)

Сайт оператора: http://wellcom.tomsk.ru
Личный кабинет: https://issa-tomsk.bwc.ru
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

function parseTrafficGb(str){
  var val = getParam(str.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
  return parseFloat((val/1024).toFixed(2));
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');

    var baseurl = "https://issa-tomsk.bwc.ru/cgi-bin/cgi.exe";

    var html = AnyBalance.requestPost(baseurl + '?function=is_login', {
        mobnum:prefs.login,
        Password:prefs.password,
        submit_button:'Войти'
    });

    var error = getParam(html, null, null, /<td[^>]*class=["']?error[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    html = AnyBalance.requestGet(baseurl + '?function=is_account');

    //AnyBalance.trace(html);
    if(!/\?function=is_exit/.test(html)){
        var error = getParam(html, null, null, /<p[^>]*style=["']color:\s*red[^>]*>([\s\S]*?)<\/p>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Актуальный баланс:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'promise', /Действующий обещанный платеж:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'avg', / Средняя скорость расходования средств по лицевому счету в день:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'daysleft', /Предположительная дата отключения без поступления средств[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet', /Лицевой счет\s*-([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'phone', /Номер телефона\s*-([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);

    html = AnyBalance.requestGet(baseurl + "?function=is_tarif&inf=3");

    getParam(html, result, 'status', /Текущее состояние[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Тарифный план:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    
    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

