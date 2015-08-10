/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс для сервиса продвижения сайтов ВебЭффектор.

Сайт оператора: http://www.webeffector.ru
Личный кабинет: http://client.webeffector.ru
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
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://client.webeffector.ru/";

    var html = AnyBalance.requestPost(baseurl + 'spring_security_check', {
        j_username:prefs.login,
        j_password:prefs.password,
        _spring_security_remember_me:'on'
    });

    var data = getParam(html, null, null, /var\s+data\s*=\s*(\{[\s\S]*?\})\s*;/);
    
    if(!data){
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неправильный логин-пароль?');
    }

    var json = JSON.parse(data);

    var result = {success: true};

    if(AnyBalance.isAvailable('balance'))
        result.balance = json.userInfo.balance;
    if(AnyBalance.isAvailable('daySpend'))
        result.daySpend = json.userInfo.daySpend;
    result.__tariff = json.userInfo.name;
    
    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

