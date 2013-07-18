/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у оператора интернет ТТК-Сибирь.

Сайт оператора: http://myttk.ru
Личный кабинет: https://stat.myttk.ru/
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

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://stat.myttk.ru/";

    if(!prefs.__dbg){
        var headers = {
            Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
            Referer:baseurl + 'login.php?backurl=%2Findex.php',
            'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.83 Safari/537.1'
        };
    
        var html = AnyBalance.requestPost(baseurl + 'login.php?backurl=%2Findex.php', {
            user_login:prefs.login,
            user_pass:prefs.password,
            enter:'',   
            testbil:''
        }, headers);
 
        AnyBalance.trace(html);
    }else{
       var html = AnyBalance.requestGet(baseurl);
    }

    if(!/\?action=logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]*class="login_error"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    getParam(html, result, 'userName', /<h2>Здравствуйте,([^<!]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'daysleft', /Интернета вам хватит примерно[\s\S]*?<span[^>]*>\s*на([^<]*)д/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet', /<span[^>]*>\s*Лицевой счет\s*<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /<td[^>]*class="value"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'agreement', />\s*Договор\s*<[\s\S]*?<td[^>]*>([\s\S]*?)(?:от|<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', />\s*Тариф\s*<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('bonus')){
        var json = AnyBalance.requestGet(baseurl + 'ajax/bonus.php');
        json = JSON.parse(json);
        if(json.error){
            AnyBalance.trace('Не удалось получить бонусный баланс, ошибка ' + json.error);
        }else{
            result.bonus = json.data.BALANCE;
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

