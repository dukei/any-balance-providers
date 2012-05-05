/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у оператора интернет и телевидения QWERTY.ru.

Сайт оператора: http://qwerty.ru/
Личный кабинет: http://billing.qwerty.ru
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

    var baseurl = "http://billing.qwerty.ru/pls/rac.q/!w3_p_main.showform";
    var html = AnyBalance.requestPost(baseurl + "?CONFIG=CONTRACT", {
	IDENTIFICATION:'CONTRACT',
	USERNAME:prefs.login,
	PASSWORD:prefs.password,
	FORMNAME:'QFRAME'
    });

    var error = getParam(html, null, null, /alert\s*\("([^"]*)"/);
    if(error)
        throw new AnyBalance.Error(error);

    var frmurl = getParam(html, null, null, /<FRAME\s+name="data"\s+SRC="([^"]*)"/i);
    if(!frmurl)
        throw new AnyBalance.Error("Не удаётся найти адрес фрейма с информацией! Обратитесь к автору.");

    var html = AnyBalance.requestGet(baseurl + frmurl);

    var result = {success: true};

    getParam(html, result, 'userName', /Клиент:[\s\S]*?<td[^>]*>([\s\S]*?)<td[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', /Лицевой счёт:[\s\S]*?<td[^>]*>([\s\S]*?)<td[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Текущий баланс[\s\S]*?<td[^>]*>(-?\d[\d\., ]*)/i, replaceFloat, parseFloat);
    getParam(html, result, 'expences', /Сумма текущих начислений:[\s\S]*?<td[^>]*>(-?\d[\d\., ]*)/i, replaceFloat, parseFloat);
    getParam(html, result, 'pays', /Сумма платежей[\s\S]*?<td[^>]*>(-?\d[\d\., ]*)/i, replaceFloat, parseFloat);
    getParam(html, result, 'recommended', /Рекомендуемая сумма платежа:[\s\S]*?<td[^>]*>(-?\d[\d\., ]*)/i, replaceFloat, parseFloat);

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

