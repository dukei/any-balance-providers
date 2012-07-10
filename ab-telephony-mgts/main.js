 /*
 
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Московская Городская Телефонная Сеть
Сайт оператора: http://www.mgts.ru/
Личный кабинет: https://lk.mgts.ru

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

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function main(){
    AnyBalance.setDefaultCharset("utf-8");
    
    var baseurl = "https://ihelper.mgts.ru/CustomerSelfCare2/";
	var prefs = AnyBalance.getPreferences();
    
    var html = AnyBalance.requestGet(baseurl);
    var viewstate = getViewState(html);

    var pin = prefs.password; //.substr(0, 8); //Слишком длинные пины тупо не воспринимаются
    
    html = AnyBalance.requestPost(baseurl + "logon.aspx", {
        	__VIEWSTATE: viewstate,
		ctl00$MainContent$tbPhoneNumber: prefs.login,
		ctl00$MainContent$tbPassword: pin,
                ctl00$MainContent$btnEnter: "Вход"
    });
    
    $html = $(html);
    var error = $.trim($html.find(".b_error").text());
    if(error)
        throw new AnyBalance.Error(error);
    
    var result = {success: true};
    getParam(html, result, 'fio', /<h3[^>]*>([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'licschet', /Лицевой счет:\s*<strong[^>]*>([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /Тарифный план:\s*<strong[^>]*>([^<]*?)\./i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /"balance-value"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    
    AnyBalance.setResult(result);
}