/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс на кошельке Элекснет

Сайт оператора: http://elecsnet.ru
Личный кабинет: https://services.elecsnet.ru
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

var replaceTagsAndSpaces = [/<span[^>]+display:\s*none[^>]*>[\s\S]*?<\/span>/gi, ' ', /&nbsp;/g, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
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
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');

    var baseurl = "https://services.elecsnet.ru/notebook/login.aspx";

    var html = AnyBalance.requestGet(baseurl);

    html = AnyBalance.requestPost(baseurl, {
        __EVENTTARGET:'',
        __EVENTARGUMENT:'',
        __VIEWSTATE:getViewState(html),
        MainLogin$UserName:prefs.login,
        MainLogin$Password:prefs.password,
        MainLogin$LoginButton:'Войти'
    });

    if(!/\WOut.aspx/i.test(html)){
        var error = getParam(html, null, null, /<p[^>]*>((?:[\s\S](?!<p))*.)<\/p>\s*<\/td>\s*<\/tr>\s*<\/table>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /<span[^>]+id="ctl00_LabelBalance"[^>]*>([\S\s]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    result.__tariff = prefs.login;
    
    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

