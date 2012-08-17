/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у новосибирского интернет провайдера Сибирские Сети

Сайт оператора: http://211.ru
Личный кабинет: http://passport.211.ru/
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
    if(val)
        val = Math.round(val*100)/100;
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseTrafficGb(str){
  var val = getParam(str.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
  return parseFloat((val/1024).toFixed(2));
}

function main(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('UTF-8');

    var baseurl = "http://passport.211.ru";

    var html = AnyBalance.requestGet(baseurl);

    html = AnyBalance.requestPost(baseurl + '/authorize/', {
        login:prefs.login,
        password:prefs.password,
        retpath: 'http://passport.211.ru/my/cabinet/'
    });

    var href = getParam(html, null, null, /(\/logout\/)/i);
    if(!href){
        var error = getParam(html, null, null, /<div[^>]*class="mypage-content"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось войти в паспорт! Изменения на сайте?");
    }

    var result = {success: true};

    getParam(html, result, 'balance', /<a[^>]*class="header-balance-button[^"]*"[^>]*>([\S\s]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /Текущий тариф:[\s\S]*?<br[^>]*>([\S\s]*?)<br[^>]*>/i, replaceTagsAndSpaces);
    getParam(html, result, 'bonus', /<a[^>]*class="header-bonus-button[^"]*"[^>]*>([\S\s]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

