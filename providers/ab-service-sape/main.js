/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс для биржи ссылок Sape.

Сайт оператора: http://www.sape.ru
Личный кабинет: https://auth.sape.ru
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
    AnyBalance.setDefaultCharset('windows-1251');

    var html = AnyBalance.requestPost('https://auth.sape.ru/login/', {
        username:prefs.login,
        password:prefs.password,
        __checkbox_bindip:true
    });

    if(!/\?act=logout/i.test(html)){
        var error = getParam(html, null, null, /<ul[^>]+class="error"[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet('http://widget.sape.ru/balance/?alt=json&tpl=balance_main&container_id=balance_widget_src&charset=windows-1251');

    var json = getJson(html);

    var result = {success: true};

    getParam(json.balanceTotal, result, 'balance', /(.*)/, replaceTagsAndSpaces, parseBalance);
    getParam(json.balanceAvailable, result, 'available', /(.*)/, replaceTagsAndSpaces, parseBalance);
    
    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

