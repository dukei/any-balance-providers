/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у Вега Нэт - Интернет-сервис провайдер, работающий на территории Клинского района

Сайт оператора: http://veganet.ru/
Личный кабинет: https://www.flex.ru/stats/
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

function parseTrafficGb(text){
    var _text = text.replace(/\s+/, '');
    var val = getParam(_text, null, null, /(-?\d[\d\.,]*)/, replaceFloat, parseFloat);
    var units = getParam(_text, null, null, /\d(kb|mb|gb|кб|мб|гб|байт|bytes)/i);
    AnyBalance.trace('Traffic units ' + units + ' from: ' + text);
    switch(units.toLowerCase()){
      case 'bytes':
      case 'байт':
        val = Math.round(val/1024/1024/1024*100)/100;
        break;
      case 'kb':
      case 'кб':
        val = Math.round(val/1024/1024*100)/100;
        break;
      case 'mb':
      case 'мб':
        val = Math.round(val/1024*100)/100;
        break;
      case 'gb':
      case 'гб':
        val = Math.round(val*100)/100;
        break;
      default:
    	AnyBalance.trace('Cannot parse traffic (' + val + ') units from: ' + text);
        break;
    }
    var textval = ''+val;
    if(textval.length > 6)
      val = Math.round(val);
    else if(textval.length > 5)
      val = Math.round(val*10)/10;

    AnyBalance.trace('Parsing traffic (' + val + ') from: ' + text);
    return val;
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

    var baseurl = "https://www.flex.ru/stats/";
    var html = AnyBalance.requestPost(baseurl + "?method=auth", {
        login:prefs.login,
        password:prefs.password,
        act:'login'
    });

    var error = getParam(html, null, null, /alert\s*\('([\s\S]*?)'\s*\)/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс лицевого счета:[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'userName', /Имя пользователя:[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', /Лицевой счет абонента №\s*([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);

    html = AnyBalance.requestGet(baseurl + '?method=show&page=traffic');
    getParam(html, result, '__tariff', /Действующий тарифный план:[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'traffic', /Зачтенный трафик с начала месяца\s*:[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseTrafficGb);
    getParam(html, result, 'status', /Состояние учетной записи:[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

