/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для московского интернет-провайдера ЭНЛАИН

Сайт оператора: http://www.nline.ru
Личный кабинет: https://www.nline.ru/cabineti
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
var replaceFloat = [/\s+/g, '', /'/g, '', /,/g, '.'];

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
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://www.nline.ru/cabineti/";

    var html = AnyBalance.requestPost(baseurl + 'index.cgi?login', {
        prefix:'005',
        login:prefs.login,
        password:prefs.password
    });

    var number = getParam(html, null, null, /005 номер:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    if(!number){
        //AnyBalance.trace(html);
        var error = getParam(html, null, null, /alert\s*\(\s*'([^']*)/, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
        
        html = AnyBalance.requestGet(baseurl + 'index.cgi');

        var number = getParam(html, null, null, /005 номер:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        if(!number)
            throw new AnyBalance.Error('Не удалось войти в личный кабинет. Пустой логин-пароль, проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Остаток средств на счете:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet', /005 номер:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'agreement', /Номер договора:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Текущий тариф:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'traffic', /Общий трафик:[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceFloat, parseTrafficGb);
    
    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

