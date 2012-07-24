/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у сотового оператора Skylink.

Сайт оператора: http://www.skylink.ru/
Личный кабинет: https://www.skypoint.ru/
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

var g_regions = {
    moscow: mainMoscow,
    uln: mainUln
};

function main(){
    var prefs = AnyBalance.getPreferences();
    
    var region = prefs.region || 'moscow';
    var regionFunc = g_regions[region] || g_regions.moscow;

    AnyBalance.trace("Entering region: " + region);

    regionFunc();
}

function mainMoscow(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://www.skypoint.ru/";
    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestGet(baseurl);
    var eventvalidation = getEventValidation(html);
    var viewstate = getViewState(html);

    html = AnyBalance.requestPost(baseurl + 'default.aspx', {
	__EVENTTARGET:'',
	__EVENTARGUMENT:'',
	__VIEWSTATE:viewstate,
	__EVENTVALIDATION:eventvalidation,
	TextBox1:prefs.login,
	TextBoxWatermarkExtender2_ClientState:'',
	TextBox2:prefs.password,
	'ImageButton1.x':8,
	'ImageButton1.y':8,
	HF1:'testvalue'
    });

    var error = getParam(html, null, null, /<td[^>]+class="INFO_Error"[^>]*>(.*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    error = getParam(html, null, null, /<span id="msg">(.*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    //Надо проверить, действительно ли нас пустили в кабинет, или просто перенаправили куда-то в другой регион
    //Но проверить не могу, нет у меня учетных данных...
    //var login_marker = getParam(html, null, null, /(...)/i);
    //if(!login_marker)
    //    throw new AnyBalance.Error("Не удалсь войти в личный кабинет. Неправильный регион?");

    var result = {success: true};

    getParam(html, result, 'userName', /Наименование клиента:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'userNum', /Номер Лицевого счета:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Баланс:[\s\S]*?(-?\d[\s\d,\.]*)/i, replaceFloat, parseFloat);
    getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

function mainUln(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://www2.skypoint.ru/login_form.aspx";
    AnyBalance.setDefaultCharset('utf-8');

    var headers = {
    	"User-Agent":'Mozilla/5.0 (Windows NT 5.1; rv:2.0) Gecko/20100101 Firefox/4.0'
    };
    
    var html = AnyBalance.requestGet(baseurl, headers);
    var eventvalidation = getEventValidation(html);
    var viewstate = getViewState(html);

    html = AnyBalance.requestPost(baseurl, {
	__EVENTTARGET:'',
	__EVENTARGUMENT:'',
	__VIEWSTATE:viewstate,
	__EVENTVALIDATION:eventvalidation,
	'ctl00$pageContent$TextBox1':prefs.login,
	'ctl00$pageContent$TextBox2':prefs.password,
	'ctl00$pageContent$ImageButton1.x':11,
	'ctl00$pageContent$ImageButton1.y':12
    }, headers
    );

    var error = getParam(html, null, null, /<span[^>]+class="err_msg"[^>]*>(.*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    //Надо проверить, действительно ли нас пустили в кабинет, или просто перенаправили куда-то в другой регион
    var login_marker = getParam(html, null, null, /<span[^>]+id="ctl00_abonent_number"[^>]*>Абонент: (.*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    if(!login_marker)
        throw new AnyBalance.Error("Не удалсь войти в личный кабинет. Неправильный регион?");

    var result = {success: true, userNum:login_marker, userName:''};

    getParam(html, result, 'balance', /Ваш баланс, по состоянию на [0-9.]*, составляет:[\s\S]*?(-?\d[\s\d,\.]*)/i, replaceFloat, parseFloat);
    getParam(html, result, 'traffic', /Суммарный трафик \(мб\)[\s\S]*?<td[^>]*>(-?\d[\s\d,\.]*)<\/td>/i, replaceFloat, parseFloat);

    var html = AnyBalance.requestGet('http://www2.skypoint.ru/pages/change_tarif2.aspx', headers);	
    getParam(html, result, '__tariff',  /<span[^>]+id="ctl00_pageContent_Label1"[^>]*>Ваш тарифный план:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
    
    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

