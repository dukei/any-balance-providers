/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры счетов банка УралСиб

Сайт оператора: http://www.uralsib.ru
Личный кабинет: https://client.uralsibbank.ru
*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

        var value;
        if(regexp){
            var matches = regexp.exec (html);
            if(matches)
                value = matches[1];
        }else{
            value = html;
        }
            
	if (typeof(value) != 'undefined') {
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

var replaceTagsAndSpaces = [/\\n/g, ' ', /\[br\]/ig, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var _text = text.replace(/\s+/g, '');
    var val = getParam(_text, null, null, /(-?\d[\d\.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseCurrency(text){
    var _text = text.replace(/\s+/g, '');
    var val = getParam(_text, null, null, /-?\d[\d\.,]*\s*(\S*)/);
    AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
    return val;
}

function parseDate(str){
    var matches = /(\d+)[^\d](\d+)[^\d](\d+)/.exec(str);
    if(matches){
          var date = new Date(+matches[3], matches[2]-1, +matches[1]);
	  var time = date.getTime();
          AnyBalance.trace('Parsing date ' + date + ' from value: ' + str);
          return time;
    }
    AnyBalance.trace('Failed to parse date from value: ' + str);
}

var g_headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
}

function do_encrypt(password, key, salt) {
	var n = key;
	var e = "3";
	var fill = "********************"
	var rsa = new RSAKey();
	rsa.setPublic(n, e);
	var res = rsa.encrypt(Base64.encode(password + salt));
        var ret = {};
	if(res) {
		ret.rsa = res;
		ret.len = fill.substr(0,password.length);
	}
	return ret;
}

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://client.uralsibbank.ru";
    
    var html = AnyBalance.requestGet(baseurl, g_headers);
    var key = getParam(html, null, null, /var n\s*=\s*"([0-9a-f]{128})"/i);
    var salt = getParam(html, null, null, /document.LoginForm.CustAuth.value\s*\+\s*"([^"]*)"/i);
    if(!key)
        throw new AnyBalance.Error("Не найден RSA ключ! Обратитесь к автору провайдера.");
    if(!salt)
        throw new AnyBalance.Error("Не найден параметр шифрования! Обратитесь к автору провайдера.");

    var pwdEncrypted = do_encrypt(prefs.password || '', key, salt);
    html = AnyBalance.requestPost(baseurl + '/login.asp', {
        RSAAuth:pwdEncrypted.rsa,
        CustIdent:prefs.login,
        CustAuth:pwdEncrypted.len,
        CustomerLogin:"Войти в систему"
    }, g_headers);

    if(!/login\.asp\?logout/i.test(html)){
        var error = getParam(html, null, null, /^(?:[\s\S](?!<NOSCRIPT))*?<p[^>]*class="errorb"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось зайти в интернет-банк. Сайт изменен?");
    }

    var result = {success: true};

    if(AnyBalance.isAvailable('all')){
        var found = [];
        html.replace(/<a[^>]+href="account_retail\.asp\?AccID=(\d+)"[^>]*>([\s\S]*?)<\/a>/ig, function(str, id, name){
            if(/^0+$/.test(id))
                return str; //Неправильный id
            found[found.length] = getParam(name, null, null, null, replaceTagsAndSpaces) + ' (ID: ' + id + ')';
            return str;
        });
        result.all = found.join('\n');
    }

    var accId = prefs.cardnum || getParam(html, null, null, /<a[^>]+href="account_retail\.asp\?AccID=(\d+)"/i);
    if(!accId || (!prefs.cardnum && /^0+$/.test(accId)))
        throw new AnyBalance.Error("У вас нет ни одного счета");

    var activeAccId = getParam(html, null, null, /<a[^>]+href="account_retail\.asp\?AccID=(\d+)"[^>]*>\s*<img/i); //Активный аккаунт
    if(activeAccId != accId)
        html = AnyBalance.requestGet(baseurl + '/account_retail.asp?AccID=' + accId);

    //Если это сообщение про IP, то игнорируем его
    var error = getParam(html, null, null, /<p[^>]+class="errorb"[^>]*>(?:[\s\S](?!IP-адрес))*?<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error) 
        throw new AnyBalance.Error(error + ' (ID: ' + accId + ')');

    getParam(html, result, '__tariff', /<h1[^>]*>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Доступно для операций[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'total', /Всего на счете[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'grace_pay', /С льготным периодом[\s\S]*?Итого[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'grace_till', /Необходимо погасить в срок до[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'limit_left', /Неиспользованная часть кредитного лимита[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'debt', /Текущая задолженность[\s\S]*?Итого[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'blocked', /Заблокировано по авторизованным транзакциям[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'currency', /Валюта счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'acctype', /Тип счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'accnum', /Номер счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'status', /Статус счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'limit', />Кредитный лимит<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'accnum_pay', /Счет для погашения[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

