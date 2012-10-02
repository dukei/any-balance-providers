/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Статистика покупок с Google Checkout.
Провайдер получает эти данные из личного Кабинета. Для работы требуется указать в настройках партнерские e-mail и пароль.
*/

var g_headers = {
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection':'keep-alive',
    //Мобильный браузер хотим
    'User-Agent':'Mozilla/5.0 (Linux; U; Android 4.0.2; en-us; Galaxy Nexus Build/ICL53F) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30'
}

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

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

function createFormParams(html, process){
    var params = {};
    html.replace(/<input[^>]+name="([^"]*)"[^>]*>/ig, function(str, name){
        var value = getParam(str, null, null, /value="([^"]*)"/i, null, html_entity_decode);
        name = html_entity_decode(name);
        if(process){
            value = process(params, str, name, value);
        }
        params[name] = value;
    });
    return params;
}

function main() {

	var result = {
        success: true
    };

    var prefs = AnyBalance.getPreferences();
    
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://accounts.google.com/ServiceLogin?service=sierra&continue=https://checkout.google.com/sell/orders?upgrade%3Dtrue&hl=ru&nui=1&ltmpl=seller&sacu=1";
    var baseurlLogin = "https://accounts.google.com/";
    
    var html = AnyBalance.requestGet(baseurl, g_headers);
    var params = createFormParams(html, function(params, input, name, value){
        var undef;
        if(name == 'Email')
            value = prefs.login;
        else if(name == 'Passwd')
            value = prefs.password;
        else if(name == 'PersistentCookie')
            value = undef; //Снимаем галочку
       
        return value;
    });
    
    //AnyBalance.trace(JSON.stringify(params));

    var html = AnyBalance.requestPost(baseurlLogin + 'ServiceLoginAuth', params, g_headers);

    //AnyBalance.trace(html);

	var r = new RegExp('<b>Входящие&nbsp;\\((\\d+)\\)</b>');
	var matches=r.exec(html);
	if(matches==null) throw new AnyBalance.Error('Ошибка разбора количества продаж');
	result.sales=parseInt(matches[1]);

	AnyBalance.setResult(result);
}
