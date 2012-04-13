/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс миль в программе Aeroflot Bonus.

Сайт оператора: http://aeroflotbonus.ru/
Личный кабинет: https://www.aeroflot.ru/personal/
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

    var baseurl = "https://www.aeroflot.ru/personal/";
    AnyBalance.setDefaultCharset('utf-8');
    
    var html = AnyBalance.requestPost(baseurl + 'login?_preferredLanguage=ru',
'------WebKitFormBoundaryHXZ9BsjPzb7lGL4m\n\
Content-Disposition: form-data; name="email_or_sabre_id"\n\
\n\
' + prefs.login + '\n\
------WebKitFormBoundaryHXZ9BsjPzb7lGL4m\n\
Content-Disposition: form-data; name="password"\n\
\n\
' + prefs.password + '\n\
------WebKitFormBoundaryHXZ9BsjPzb7lGL4m\n\
Content-Disposition: form-data; name="submit0"\n\
\n\
Подождите...\n\
------WebKitFormBoundaryHXZ9BsjPzb7lGL4m\n\
Content-Disposition: form-data; name="return_url"\n\
\n\
\n\
------WebKitFormBoundaryHXZ9BsjPzb7lGL4m--\n\
', {'Content-Type': 'multipart/form-data; boundary=----WebKitFormBoundaryHXZ9BsjPzb7lGL4m'});

    var error = getParam(html, null, null, /<!-- :: errors :: -->\s*<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    var result = {success: true};

    html = AnyBalance.requestGet(baseurl + 'ajax/mile_balance');

    getParam(html, result, 'balance', /^(\d+)/i, replaceFloat, parseFloat);
    getParam(html, result, 'qmiles', /,(\d+)/i, replaceFloat, parseFloat);
    getParam(html, result, 'level', /.*?,.*?,(.*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /.*?,.*?,(.*)/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

