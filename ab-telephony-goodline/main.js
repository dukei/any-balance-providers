 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

ГудЛайн первый разумный роуминг
Сайт оператора: http://www.goodline.ru/
Личный кабинет: http://goodline.ru/ru/abonents/entercabinet/
*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var value = regexp ? regexp.exec (html) : [html, html];
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

var replaceTagsAndSpaces = [/&nbsp;/i, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseCurrency(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /-?\d[\d\s.,]*(\S*)/);
    AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    if(prefs.num && !/^\d{10,}$/.test(prefs.num))
        throw new AnyBalance.Error("Введите номер телефона, по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому номеру.");

    AnyBalance.setDefaultCharset('utf-8');    

    var baseurl = 'http://goodline.ru';
    
    var info = AnyBalance.requestPost(baseurl + "/ru/abonents/entercabinet/", {
        mail:prefs.login,
        passwd:prefs.password
    });

    var error = getParam(info, null, null, /(Введите логин\/пароль для входа в систему)/i);
    if(error)
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Проверьте логин/пароль");
                        
    var result = {
        success: true
    };

    var num = prefs.num ? prefs.num : '\\d{10,}';
    var tr = getParam(info, null, null, new RegExp('Ваш список номеров туристических[\\s\\S]*?(<tr[^>]*>\\s*<td[^>]*>[\\s\\S]*?<\\/td>\\s*<td[^>]*>' + num + '<\\/td>[\\s\\S]*?<\/tr>)', 'i'));
    if(!tr)
        throw new AnyBalance.Error(prefs.num ? "Не удалось найти номер " + prefs.num : "Не удалось найти ни одного номера.");

    getParam(tr, result, 'status', /(?:[\s\S]*?<\/td>){2}\s*<td[^>]*>([^<]*)/i, replaceTagsAndSpaces);
    getParam(tr, result, 'number', /(?:[\s\S]*?<\/td>){1}\s*<td[^>]*>([^<]*)/i, replaceTagsAndSpaces);

    var tariff_ref = getParam(tr, null, null, /'(\/tariffs.php\?onum=[^']*)/i);
    if(tariff_ref){
        html = AnyBalance.requestGet(baseurl + tariff_ref);
        getParam(html, result, '__tariff', /<tr[^>]*class="tariffs"[\s\S]*?<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    }else{
        AnyBalance.trace("Не удалось найти ссылку на тарифный план!");
    }
    
    if(AnyBalance.isAvailable('balance', 'currency')){
        var id = getParam(tr, null, null, /entercabinet\/list\/delete\/([^\.]*)\.html/i);
        if(!id)
            throw new AnyBalance.Error("Не удалось найти ссылку на информацию о балансе.");

        html = AnyBalance.requestGet(baseurl + '/ru/abonents/entercabinet/balans/get_value/?ajax=1&id=' + id, {'X-Requested-With':'XMLHttpRequest'});
        getParam(html, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'currency', null, replaceTagsAndSpaces, parseCurrency);
    }
		
    AnyBalance.setResult(result);
}

