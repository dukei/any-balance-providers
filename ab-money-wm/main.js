/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и номер счета Яндекс.Деньги

Сайт оператора: http://money.yandex.ru/
Личный кабинет: https://money.yandex.ru/
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

    if(!prefs.login)
        throw new AnyBalance.Error("Введите логин!");
    if(!prefs.password)
        throw new AnyBalance.Error("Введите пароль!");

    var baseurl = "https://enter.webmoney.ru/addLP.aspx";

    var html = AnyBalance.requestGet(baseurl);

    html = AnyBalance.requestPost(baseurl, {
      __EVENTTARGET:'',
      __EVENTARGUMENT:'',
      __VIEWSTATE: getViewState(html),
      __EVENTVALIDATION: getEventValidation(html),
      search: 'Найти информацию',
      ctl00$CPH_Body$TB_WMID: prefs.login,
      ctl00$CPH_Body$TB_PWD:prefs.password,
      ctl00$CPH_Body$B_CheckPwd: 'Искать'
    });

    var error = getParam(html, null, null, /<div[^>]*id="ctl00_CPH_Body_VSPE"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    if(error)
        throw new AnyBalance.Error(error);

    if(!/<div[^>]*class="purses"/i.test(html))
        throw new AnyBalance.Error("Не удалось зайти. Проверьте логин и пароль.");

    var result={success: true};

    getParam(html, result, 'wmr', /<div[^>]*class="purses"[^>]*title="[^"]*?([\d\.,]*)WMR/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'wmz', /<div[^>]*class="purses"[^>]*title="[^"]*?([\d\.,]*)WMZ/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'wme', /<div[^>]*class="purses"[^>]*title="[^"]*?([\d\.,]*)WME/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'wmu', /<div[^>]*class="purses"[^>]*title="[^"]*?([\d\.,]*)WMU/i, replaceTagsAndSpaces, parseBalance);
    getParam(prefs.login, result, '__tariff', /(.*)/i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}
