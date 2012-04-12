/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у оператора интернет ТТК-Байкал.

Сайт оператора: http://baikal-ttk.ru/
Личный кабинет: https://stat.baikal-ttk.ru
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

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://stat.baikal-ttk.ru/";
    
    var html = AnyBalance.requestGet(baseurl);
    var login_name = getParam(html, null, null, /(login_remote\w+)/i);
    var pass_name = getParam(html, null, null, /(password_remote\w+)/i);

    if(!login_name || !pass_name)
      throw new AnyBalance.Error('Не удалось найти форму входа в личный кабинет!');

    var params = {
	roiiur:0,
	soiiur:true,
	redirect:''
    };

    params[login_name] = prefs.login;
    params[pass_name] = prefs.password;

    params['action.remote_login.0kiiur.x'] = 23;
    params['action.remote_login.0kiiur.y'] = 6;

    var html = AnyBalance.requestPost(baseurl + 'login', params);

    var error = getParam(html, null, null, /<font [^>]*class="error"[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    var result = {success: true};

    html = AnyBalance.requestGet(baseurl + 'webUserLogin');

    getParam(html, result, 'userName', /<!-- Наименование клиента -->[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', /Договор (\d+) от/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'status', /Состояние:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Итого на [\s\S]*?<td[^>]*><b>\s*(-?\d[\d\.,\s]*)/i, replaceFloat, parseFloat);

    var href = getParam(html, null, null, /<a href=["']([^'"]+)["'][^>]*>сменить тариф Интернет<\/a>/i);
    if(href){
	html = AnyBalance.requestGet(baseurl + href);
        getParam(html, result, '__tariff', /Текущий тариф[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    }

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

