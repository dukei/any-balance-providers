/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у сотового оператора Utel - корпоративный портал.

Сайт оператора: http://Utel.ru/
Личный кабинет: https://ucabinet-old.u-tel.ru/work.html
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

function parseBalance(text){
    text = text.replace(/\s+/, '');
    var val = getParam(text, null, null, /(-?\d[\d\.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function requestPostMultipart(url, data, headers){
	var parts = [];
	var boundary = '------WebKitFormBoundaryrceZMlz5Js39A2A6';
	for(var name in data){
		parts.push(boundary, 
		'Content-Disposition: form-data; name="' + name + '"',
		'',
		data[name]);
	}
	parts.push(boundary);
        if(!headers) headers = {};
	headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary.substr(2);
	return AnyBalance.requestPost(url, parts.join('\r\n'), headers);
}

function createFormParams(html, process){
    var params = {};
    html.replace(/<input[^>]+name="([^"]*)"[^>]*>/ig, function(str, name){
        var value = getParam(str, null, null, /value="([^"]*)"/i, null, html_entity_decode);
        name = html_entity_decode(name);
        if(process){
            value = process(params, str, name, value);
        }
        if(typeof(value) != 'undefined')
            params[name] = value;
    });
    return params;
}

var g_headers = {
	'Origin': 'https://ucabinet-old.u-tel.ru',
	'Referer': 'https://ucabinet-old.u-tel.ru/work.html',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.162 Safari/535.19'
};

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://ucabinet-old.u-tel.ru/work.html";
    AnyBalance.setDefaultCharset('windows-1251');

    var html = AnyBalance.requestGet(baseurl, g_headers);
    var params = createFormParams(html, function(params, input, name, value){
        var undef;
        var id = getParam(input, null, null, /id="([^"]*)"/i);
        if(name == 'user_input_timestamp')
            value = new Date().getTime();
        else if(id == 'ASK_MSISDN')
            value = prefs.login;
        else if(name == 'login')
            value = prefs.login;
        else if(id == 'ASK_PWD')
            value = prefs.password;
        else if(name == 'password')
            value = prefs.password;
        else if(name == 'user_input_3')
            value = 'Вход в Uкабинет';
        else if(name == 'user_input_0')
            value = '_next';
       
        return value;
    });
    
    var html = requestPostMultipart(baseurl, params, g_headers);

    if(!/'EXIT'/i.test(html)){
        var error = getParam(html, null, null, /<td[^>]+class="INFO(?:_Error|_caption)?"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Сайт изменен?");
    }

    var result = {success: true};

    getParam(html, result, 'userNum', /Номер вашего телефона:([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Ваш баланс:([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /Ваш тариф:([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

