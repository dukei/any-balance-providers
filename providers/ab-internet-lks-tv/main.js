/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для липецкого интернет-тв-провайдера Телемир

Сайт оператора: http://lks-tv.ru
Личный кабинет: http://stat.lks-tv.ru
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

    var baseurl = "http://stat.lks-tv.ru/";

    var html = AnyBalance.requestPost(baseurl, {
        status_form:'entered',
        login:prefs.login,
        password:prefs.password,
        x:56,
        y:14
    });

    //AnyBalance.trace(html);
    if(!/\?mode=logout/.test(html)){
        var error = getParam(html, null, null, /<div[^>]*class=["']sysMessage[^>]*>([\s\S]*?)<\/div>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс\s*:([\S\s]*?)<br/i, replaceTagsAndSpaces, parseBalance);

    var tariff_inet = getParam(html, null, null, /Тариф интернет\s*:([\S\s]*?)<br/i, replaceTagsAndSpaces, html_entity_decode);
    var tariff_tv = getParam(html, null, null, /Тариф ТВ\s*:([\S\s]*?)<br/i, replaceTagsAndSpaces, html_entity_decode);
    var tariffs = [];
    if(tariff_inet)
        tariffs[tariffs.length] = 'Интернет: ' + tariff_inet;
    if(tariff_tv)
        tariffs[tariffs.length] = 'ТВ: ' + tariff_tv;
    result.__tariff = tariffs.join(', ');

    getParam(html, result, 'userName', /Абонент\s*:([\S\s]*?)<br/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'agreement', /Идентификатор\s*:([\S\s]*?)<br/i, replaceTagsAndSpaces, html_entity_decode);
    
    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

