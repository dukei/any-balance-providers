/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у оператора интернет Диалог-К (Красноармейск, Моск. обл.)

Сайт оператора: http://krasno.ru
Личный кабинет: https://billing.krasno.ru/login.php
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
var replaceFloat = [/Задолженность/i, '-', /\s+/g, '', /,/g, '.'];

function parseTrafficGb(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    val = Math.round(val/1024*100)/100; //Перевели в Гб с двумя знаками после запятой
    AnyBalance.trace('Parsing traffic (' + val + ') from: ' + text);
    return val;
}

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://billing.krasno.ru/";
    
    var html = AnyBalance.requestGet(baseurl + 'login.php');
    var login_name = getParam(html, null, null, /(_auth_username\w+)/i);
    var pass_name = getParam(html, null, null, /(_auth_password\w+)/i);

    if(!login_name || !pass_name)
      throw new AnyBalance.Error('Не удалось найти форму входа в личный кабинет!');

    var params = {};
    params[login_name] = prefs.login;
    params[pass_name] = prefs.password;

    var html = AnyBalance.requestPost(baseurl + 'info.php', params);

    var error = getParam(html, null, null, /(Вы вошли в систему)/i, replaceTagsAndSpaces, html_entity_decode);
    if(!error)
        throw new AnyBalance.Error("Не удалось войти. Проверьте логин и пароль.");

    var result = {success: true};

    getParam(html, result, 'userName', /Абонент:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', /Лицевой счет[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Тарифный план[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Актуальный баланс[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'trafficLeft', /Остаток оплаченного трафика[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
    getParam(html, result, 'block', /Блокировка[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

