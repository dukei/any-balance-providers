/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для сибирского провайдера Комстар-регионы (МТС)

Сайт оператора: http://sib.comstar-r.ru/
Личный кабинет: http://lka.sib.comstar-r.ru
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

var replaceTagsAndSpaces = [/&nbsp;/g, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseBalanceRK(_text){
    var text = _text.replace(/\s+/g, '');
    var rub = getParam(text, null, null, /(-?\d[\d\.,]*)руб/i, replaceFloat, parseFloat) || 0;
    var kop = getParam(text, null, null, /(-?\d[\d\.,]*)коп/i, replaceFloat, parseFloat) || 0;
    var val = rub+kop/100;
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + _text);
    return val;
}

function parseTrafficGb(str){
  var val = getParam(str.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
  return parseFloat((val/1024).toFixed(2));
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://lka.sib.comstar-r.ru";

    var city2num = {bug: 26, buz: 26, kem: 29, nef: 2, nizv: 16, novk: 30, novt: 26, noy: 7, nyg: 4, orn: 26, prm: 26, prg: 26, pyh: 2, rad: 8, sor: 26, sur: 5, tob: 28, tum: 26} 

    if(prefs.type != 0 && prefs.type != 500 && prefs.type != 550 && !prefs.city)
        throw new AnyBalance.Error('Для выбранного типа подключения необходимо явно указать ваш город.');

/*    AnyBalance.trace(JSON.stringify({
        extDvc:prefs.type,
        authCity:(prefs.city && city2num[prefs.city]) || 26,
        authLogin:prefs.login,
        authPassword:prefs.password,
        userAction:'auth'
    }));
*/
    var html = AnyBalance.requestPost(baseurl + '/?referer_uri=/default/account/index/', {
        extDvc:prefs.type,
        authCity:(prefs.city && city2num[prefs.city]) || 26,
        authLogin:prefs.login,
        authPassword:prefs.password,
        userAction:'auth'
    });

    //AnyBalance.trace(html);
    if(!/\/index\/logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]*background-color:\s*Maroon[^>]*>([\s\S]*?)<\/div>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс:[\S\s]*?<strong[^>]*>([\S\s]*?)<\/strong>/i, replaceTagsAndSpaces, parseBalanceRK);
    getParam(html, result, 'status', /Статус:[\S\s]*?<strong[^>]*>([\S\s]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', /Лицевой счёт:[\S\s]*?<strong[^>]*>([\S\s]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Тарифный план:[\S\s]*?<strong[^>]*>([\S\s]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

