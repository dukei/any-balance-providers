/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для украинского интернет-провайдера Airbites

Сайт оператора: https://airbites.net.ua
Личный кабинет: https://airbites.net.ua/enteruser
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

var g_cities = {
    lviv: 1,
    kharkiv: 5,
    'ivano-frankivsk': 2,
    khmelnyczkyj: 14,
    rivne: 4,
    lutsk: 3
};

var g_headers = {
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection':'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.4 (KHTML, like Gecko) Chrome/22.0.1229.79 Safari/537.4'
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://airbites.net.ua/";

    var city = prefs.city;
    if(!g_cities[city]) city = 'lviv';

    AnyBalance.trace('Entering city: ' + city);

    var html = AnyBalance.requestPost(baseurl + 'enteruser', {
        txt_login:prefs.login,
        txt_pass:prefs.password,
        txt_city:g_cities[city]
    }, g_headers);

    //AnyBalance.trace(html);
    if(!/<div[^>]*class="exit"[^>]*>/.test(html)){
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неправильный логин или пароль?');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /(?:Остаток на счете|Залишок на рахунку|Remains on account):[\S\s]*?<a[^>]*>([\S\s]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'statusInet', /(?:Статус Интернета|Стан Інтернету|Internet status):[\S\s]*?<a[^>]*>([\S\s]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
    var inetStatus = getParam(html, null, null, /(?:Статус Интернета|Стан Інтернету|Internet status):[\S\s]*?<a[^>]*class="([^"]*)/i);
    getParam(html, result, 'statusTv', /(?:Статус ТВ|Стан ТВ|TV status):[\S\s]*?<a[^>]*>([\S\s]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
    var tvStatus = getParam(html, null, null, /(?:Статус ТВ|Стан ТВ|TV status):[\S\s]*?<a[^>]*class="([^"]*)/i);
    getParam(html, result, 'statusVoip', /(?:Статус VOIP|Стан VOIP|VOIP status):[\S\s]*?<a[^>]*>([\S\s]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);

    if(inetStatus != 'nonactive'){
        html = AnyBalance.requestGet(baseurl + city + '/pryvatnyj/my/internet/myinternet', g_headers);
        getParam(html, result, '__tariff', /(?:Название пакета|Назва пакету|Name of tariff)[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'abon', /(?:Сумма абонентской платы|Сума абонентської плати|Amount of fee)[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
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

