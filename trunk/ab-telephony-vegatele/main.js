 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

VEGA — телефонная фиксированная связь в городах Украины
Сайт оператора: http://www.vegatele.com
Личный кабинет: https://my.vegatele.com

*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var value = regexp ? regexp.exec (html) : html;
	if (value) {
                if(regexp)
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

var replaceTagsAndSpaces = [/&nbsp;/ig, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.', /(\d)\-(\d)/g, '$1.$2'];

function parseBalance(text){
    var _text = text.replace(/\s+/g, '');
    var val = getParam(_text, null, null, /(-?\d[\d\.,\-]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseCurrency(text){
    var _text = text.replace(/\s+/g, '');
    var val = getParam(_text, null, null, /[\d\.,\-]+(\S*)/);
    AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
    return val;
}

function getJson(html){
    try{
        return JSON.parse(html);
    }catch(e){
        AnyBalance.trace('wrong json: ' + e.message + ' (' + html + ')');
        throw new AnyBalance.Error('Неправильный ответ сервера. Если эта ошибка повторяется, обратитесь к автору провайдера.');
    }
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');    

    var baseurl = "https://my.vegatele.com/";
    var html = AnyBalance.requestGet(baseurl + 'login_pc_tel');
    var token = getParam(html, null, null, /<input[^>]+name="csrf_token"[^>]*value="([^"]*)/i);
    if(!token)
       throw new AnyBalance.Error('Не удаётся найти форму входа. Проблемы на сайте или сайт изменен.');

    html = AnyBalance.requestPost(baseurl + 'auth/login', {
        csrf_token:token,
        login_method:prefs.login_method,
        login:prefs.login,
        password:prefs.password,
        'submit.x':16,
        'submit.y':14,
        submit:'submit'
    });

    if(!/\/logout/i.test(html)){
        var error = getParam(html, null, null, /<span[^>]*class=["']red\s*-small[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }
    
    var result = {
        success: true
    };

    var dogid = getParam(html, null, null, /<input[^>]+id="hdogid"[^>]*value="([^"]*)/i);
    if(!dogid)
        throw new AnyBalance.Error('Не удалось получить номер лицевого счета. Сайт изменен?');

    html = AnyBalance.requestGet(baseurl + 'cabinet/url_get_services/' + dogid + '/' + Math.random());
    var json = getJson(html);
    if(json.error)
        throw new AnyBalance.Error(json.error);

    if(AnyBalance.isAvailable('balance'))
        result.balance = Math.round(json.balance.balance*100)/100;

    if(AnyBalance.isAvailable('fio'))
        result.fio = json.ClientName;

    for(var i=0; i<json.services.length; ++i){
        var service = json.services[i];
        if(!prefs.number || service.name_conn == prefs.number){
            if(AnyBalance.isAvailable('number'))
                result.number = service.name_conn;
            if(AnyBalance.isAvailable('status'))
                result.status = service.status == '0' ? 'Активна' : 'Не активна';
            result.__tariff = service.tm_name;
            break;
        }
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

