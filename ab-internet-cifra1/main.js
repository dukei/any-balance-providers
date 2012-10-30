/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для томского интернет-провайдера FibreNET

Сайт оператора: http://fibrenet.ru
Личный кабинет: https://billing.fibrenet.ru
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

function getJson(html){
   try{
       var json = JSON.parse(html);
       return json;
   }catch(e){
       AnyBalance.trace('Bad json (' + e.message + '): ' + html);
       throw new AnyBalance.Error('Сервер вернул ошибочные данные: ' + e.message);
   }
}

var g_regionsById = {
    ultranet: getUltranet
};

var g_regionsByUrl = {
    'https://stat.ultranet.ru/login/': 'ultranet'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var params, region;
    if(!prefs.region || prefs.region == 'auto' || !g_regionsById[prefs.region]){
        var info = AnyBalance.requestGet('http://www.cifra1.ru/?singleAction=get_login_form_action&login=' + encodeURIComponent(prefs.login));
        var json = getJson(info);
        if(json.error)
            throw new AnyBalance.Error('Неверный номер договора: ' + prefs.login);
        params = {from_url_9: ''};
        params[json.LOGIN] = prefs.login;
        params[json.PASSW] = prefs.password;

        var region = g_regionsByUrl[json.ACTION];
        if(!region)
            throw new AnyBalance.Error('Личный кабинет для вашего номера договора: ' + json.ACTION + '. К сожалению, он пока не поддерживается. Обратитесь к автору провайдера по е-мейл, чтобы добавить его поддержку.');
    }else{
        region = prefs.region;    
    }

    AnyBalance.trace('region: ' + region);
    g_regionsById[region](region, params);
}

function getUltranet(region, params){
    var baseurl = 'https://stat.ultranet.ru/';
    var prefs = AnyBalance.getPreferences();

    if(!params)
        params = {
            login: prefs.login,
            password: prefs.password,
            email: ''
        };

    var html = AnyBalance.requestPost(baseurl + 'login/', params);
 
    if(!/\/login\/destroySessionId/i.test(html)){
        var error = getParam(html, null, null, /<p[^>]*class=["'][^"']*error[^>]*>([\s\S]*?)<\/p>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс:([\S\s]*?)<span/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /Состояние доступа:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'agreement', /PIN:([\S\s]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Тариф:[\S\s]*?<td[^>]*>([\S\s]*?)(?:<\/td>|<a)/i, replaceTagsAndSpaces, html_entity_decode);
    AnyBalance.setResult(result);
}    


function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

