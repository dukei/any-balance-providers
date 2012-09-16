/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Лень карта ИОН

Сайт: http://i-on.ru/
Личный кабинет: http://old.i-on.ru/Welcome/
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

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function main(){
    var baseurl = "http://old.i-on.ru/Welcome";
    var prefs = AnyBalance.getPreferences();
    var html = AnyBalance.requestGet(baseurl);
    
    html = AnyBalance.requestPost(baseurl, {
        __EVENTTARGET:'',
        __EVENTARGUMENT:'',
        __VIEWSTATE:getViewState(html),
        ctl06$ctl00$ctl00$ctl00$Default1$PartA1$Simple1$SearchText:'Поиск по товарам',
        ctl06$ctl00$ctl01$Login1$UserName:prefs.login,
        ctl06$ctl00$ctl01$Login1$Password:prefs.password,
        ctl06$ctl00$ctl01$Login1$LoginButton:'Войти',
        __EVENTVALIDATION:getEventValidation(html)
    });

    var loggedin = getParam(html, null, null, /(Добро пожаловать,)/i);
    if(!loggedin)
        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Проверьте номер карты и пароль.");

    var result = {success: true};
   
    getParam(html, result, 'balance', /Сейчас на Вашей карте[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'new', /Будут скоро активированы ещё[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'total', /Всего было накоплено[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'off', /Всего было потрачено[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}

