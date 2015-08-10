/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для московского интернет-провайдера ЮМОС

Сайт оператора: http://umos.su
Личный кабинет: https://billing.umos.su/client/
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

    var baseurl = "https://billing.umos.su/client/";

    var html = AnyBalance.requestPost(baseurl, {
        login:prefs.login,
        password:prefs.password
    });

    //AnyBalance.trace(html);
    if(!/'devision',\s*'-1'/i.test(html)){
        //var error = getParam(html, null, null, /<p[^>]*style=["']color:\s*red[^>]*>([\s\S]*?)<\/p>/, replaceTagsAndSpaces, html_entity_decode);
        //if(error)
        //    throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неправильный логин или пароль?');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /<td[^>]*>\s*Баланс(?:[\S\s]*?<td[^>]*>){5}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /<td[^>]*>\s*Состояние(?:[\S\s]*?<td[^>]*>){7}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'agreement', /<td[^>]*>\s*Номер договора(?:[\S\s]*?<td[^>]*>){5}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /<td[^>]*>\s*Тариф(?:[\S\s]*?<td[^>]*>){7}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
        var now = new Date();
        var html = AnyBalance.requestPost(baseurl + 'index.php', {
            devision:2,
            service:1,
            statmode:0,
            vgstat:0,
            timeblock:3,
            year_from:now.getFullYear(),
            month_from:now.getMonth()+1,
            day_from:1,
            year_till:now.getFullYear(),
            month_till:now.getMonth()+1,
            day_till:now.getDate()
       });

       getParam(html, result, 'trafficIn', /Входящий(?:[\s\S]*?<td[^>]*>){6}([\S\s]*?)<\/td>/i, replaceFloat, parseTrafficGb);
       getParam(html, result, 'trafficOut', /Исходящий(?:[\s\S]*?<td[^>]*>){6}([\S\s]*?)<\/td>/i, replaceFloat, parseTrafficGb);
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

