/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры у украинского интернет-провайдера Триолан

Сайт оператора: http://triolan.com/
Личный кабинет: https://triolan.name/
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

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function getEventValidation(html){
    return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/);
}

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseDate(str){
    AnyBalance.trace('Parsing date from value: ' + str);
    var matches = /(\d+)[^\d](\d+)[^\d](\d+)/.exec(str);
    var time;
    if(matches){
	  time = (new Date(+matches[1], matches[2]-1, +matches[3])).getTime();
    }
    return time;
}

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://triolan.name/";
    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestGet(baseurl);
    var eventvalidation = getEventValidation(html);
    var viewstate = getViewState(html);

    html = AnyBalance.requestPost(baseurl, {
      __EVENTTARGET:'',
      __EVENTARGUMENT:'',
      __VIEWSTATE:viewstate,
      __EVENTVALIDATION:eventvalidation,
      tb_login:prefs.login,
      tb_pass:prefs.password,
      'ib_login.x':37,
      'ib_login.y':14
    });

    var error = getParam(html, null, null, /id="l_error"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    var result = {success: true};
    getParam(html, result, 'license', /id="l_stat"[\s\S]*?Л\/с[\s\S]*?>([^<]*)</i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /id="l_stat"[\s\S]*?Пакет:[\s\S]*?>"?([^<]*)"?</i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /id="l_stat"[\s\S]*?Баланс:[\s\S]*?>"?([^<]*)"?</i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'till', /id="l_stat"[\s\S]*?оплачено по:[\s\S]*?>([^<]*)</i, replaceTagsAndSpaces, parseDate);

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

