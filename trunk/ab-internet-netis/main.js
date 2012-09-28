/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для ярославского интернет-провайдера Netis

Сайт оператора: http://netis.ru
Личный кабинет: http://www.netis.ru/clients/stat.php
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
        if(!headers)
            headers = {};
	headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary.substr(2);
	return AnyBalance.requestPost(url, parts.join('\r\n'), headers);
}

function createFormParams(html, process){
    var params = {};
    html.replace(/<input[^>]+name="([^"]*)"[^>]*>|<select[^>]+name="([^"]*)"[^>]*>[\s\S]*?<\/select>/ig, function(str, nameInp, nameSel){
        var value = '';
        if(nameInp){
            value = getParam(str, null, null, /value="([^"]*)"/i, null, html_entity_decode);
            name = nameInp;
        }else if(nameSel){
            value = getParam(str, null, null, /^<[^>]*value="([^"]*)"/i, null, html_entity_decode);
            if(typeof(value) == 'undefined'){
                var optSel = getParam(str, null, null, /(<option[^>]+selected[^>]*>)/i);
                if(!optSel)
                    optSel = getParam(str, null, null, /(<option[^>]*>)/i);
                value = getParam(optSel, null, null, /value="([^"]*)"/i, null, html_entity_decode);
            }
            name = nameSel;
        }

        name = html_entity_decode(name);
        if(process){
            value = process(params, str, name, value);
        }
        if(typeof(value) != 'undefined')
            params[name] = value;
    });

    AnyBalance.trace('Form params are: ' + JSON.stringify(params));
    return params;
}

function createParamsArray(params){
    var a = [];
    for(var i in params)
        a[a.length] = encodeURIComponent(i) + '=' + encodeURIComponent(params[i]);
    return a;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://stat.netis.ru/";

    var html = requestPostMultipart(baseurl + 'login.pl', {
        user:prefs.login,
        password:prefs.password,
        submit: 'Вход',
        'return': baseurl + 'index.pl'
    });

    //AnyBalance.trace(html);
    if(!/\?mode=logout/.test(html)){
        var error = getParam(html, null, null, /<p[^>]*class="error"[^>]*>([\s\S]*?)<\/p>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс лицевого счёта:\s*<b[^>]*>([\S\s]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet', /Лицевой счёт:\s*(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'agreement', /Номер договора:\s*<i[^>]*>([\S\s]*?)<\/i>/i, replaceTagsAndSpaces, html_entity_decode);

    html = AnyBalance.requestGet(baseurl + "view/contr_srv.pl");

    getParam(html, result, '__tariff', /Выделенный доступ(?:[\S\s]*?<td[^>]*>){3}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('traffic')){
        html = AnyBalance.requestGet(baseurl + 'view/consume.pl');
        var form = getParam(html, null, null, /<form[^>]*name="form">([\s\S]*?)<\/form>/i);

        var params = createFormParams(form, function(params, str, name, value){
            if(/type="submit"/i.test(str) && name != 'showsum')
                return;
            if(name == 'tax')
                return;
            return value;
        });

        html = AnyBalance.requestGet(baseurl + 'view/consume.pl?' + createParamsArray(params).join('&'));

       getParam(html, result, 'traffic', /Всего[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceFloat, parseTrafficGb);
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

