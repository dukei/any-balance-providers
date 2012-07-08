/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Данные по Федеральному интернет провайдеру Сумма Телеком, представленному 
в городах Санкт-Петербург, Нижний Новгород, Тула, Орел, Воронеж, Липецк, Ростов-на-Дону, Тверь, Краснодар, Махачкала, Каспийск

Сайт оператора: http://www.sumtel.ru
Личный кабинет: https://stat.sumtel.ru/
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

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://stat.sumtel.ru/";
    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestGet(baseurl);
    var eventvalidation = getEventValidation(html);
    var viewstate = getViewState(html);

    html = AnyBalance.requestPost(baseurl + 'Default.aspx', {
      __EVENTTARGET:'',
      __EVENTARGUMENT:'',
      __VIEWSTATE:viewstate,
      __EVENTVALIDATION: eventvalidation,
      ctl00$txtLogin:prefs.login,
      ctl00$txtPassword:prefs.password,
      ctl00$btnLogin:'ВОЙТИ'
    });

    var error = getParam(html, null, null, /lblError[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    var result = {success: true};

    getParam(html, result, 'balance', /lblOstatok[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /lblStatus[^>]*>([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /lblTarifName[^>]*>([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'abon', /lblTarifCost[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'fio', /lblClientName[^>]*>([^<]*)/i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

