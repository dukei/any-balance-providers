/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для уфимского интернет-провайдера Ufanet

Сайт оператора: http://ufanet.ru/
Личный кабинет: https://my.ufanet.ru/
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

function parseTrafficGb(str){
  var val = getParam(str.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
  return parseFloat((val/1024).toFixed(2));
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://my.ufanet.ru/";

    var html = AnyBalance.requestPost(baseurl + 'login', {
        city:prefs.city,
        contract:prefs.login,
        password:prefs.password
    });

    //AnyBalance.trace(html);
    if(!/\/logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]*class=["']error[^>]*>([\s\S]*?)<\/div>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Остаток на счете:[\S\s]*?<p[^>]*>([\S\s]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'pay', /Рекомендуемая сумма к оплате:[\S\s]*?<p[^>]*>([\S\s]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'daysleft', /До конца учетного периода:[\S\s]*?<p[^>]*>([\S\s]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'agreement', /№ договора[\S\s]*?<p[^>]*>([\S\s]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);

    html = AnyBalance.requestGet(baseurl + "contract/information");

    getParam(html, result, '__tariff', /Тарифный план([\S\s]*?)(?:сменить|<\/p>|\(<a)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'abon', /Абонентская плата([\S\s]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

