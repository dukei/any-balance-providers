/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у новосибирского интернет-провайдера новотелеком.

Сайт оператора: http://www.novotelecom.ru/
Личный кабинет: https://billing.novotelecom.ru
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

function getTrafficGb(str){
  return parseFloat((parseFloat(str)/1024).toFixed(2));
}

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://billing.novotelecom.ru/billing/user/";
    var html = AnyBalance.requestPost(baseurl + "login/", {
        form_name:'login',
        form_back_url:baseurl,
        form_action:'',
        login:prefs.login,
        password:prefs.password,
        back_url:'/'
    });

    var error = getParam(html, null, null, /<div[^>]*class=['"]rxt fail['"][^>]*>[\s\S]*?<div[^>]*class=['"]rxt-content['"][^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    html = AnyBalance.requestGet(baseurl + 'connect/');

    var result = {success: true};

    getParam(html, result, 'balance', /<h1[^>]*class="balance"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'userName', /<div[^>]*class="rxt personal"[^>]*>[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', /Договор №\s*(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'till', /Хватит примерно на\s*(\d+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'porog', /Порог отключения:[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);

    getParam(html, result, '__tariff', /<div[^>]*class="ap"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'abon', /Абонентская плата[\s\S]*?<h1[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

