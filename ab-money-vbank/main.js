/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт банка возрождения через интернет банк.

Сайт оператора: http://www.vbank.ru
Личный кабинет: https://online.bankcard.ru
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

var replaceTagsAndSpaces = [/&nbsp;/g, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
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

function parseDate(str){
    var matches = /(\d+)[^\d](\d+)[^\d](\d+)/.exec(str);
    var time = 0;
    if(matches){
	  time = (new Date(+matches[3], matches[2]-1, +matches[1])).getTime();
    }
    AnyBalance.trace('Parsing date ' + new Date(time) + 'from value: ' +  str);
    return time;
}

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function getEventValidation(html){
    return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/);
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://online.bankcard.ru/client/";
    AnyBalance.setDefaultCharset("utf-8");
    
    if(prefs.num && !/^\d{4}$/.test(prefs.num))
        throw new AnyBalance.Error("Введите последние 4 цифры карты или не вводите ничего, чтобы показать информацию по первой карте.");

    var html = AnyBalance.requestGet(baseurl + 'login.aspx');

    html = AnyBalance.requestPost(baseurl + 'login.aspx', {
        __VIEWSTATE:getViewState(html),
        __EVENTVALIDATION:getEventValidation(html),
        m$body$mode:'password',
        m$body$login:prefs.login,
        m$body$password:prefs.password,
        m$body$card:'',
        m$body$token:'',
        m$body$logon:'Вход в систему'
    });

    if(!/\/client\/logout\.aspx/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]class="error"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
        if(/changepassword.aspx/i.test(html)){
            AnyBalance.requestGet(baseurl + 'logout.aspx'); //На всякий случай попробуем выйти, но вообще-то ничего кроме смены пароля сделать почему-то нельзя...
            throw new AnyBalance.Error('Банк требует сменить пароль. Пожалуйста, зайдите в интернет-банк https://online.bankcard.ru через браузер, смените пароль, а затем введите новый пароль в настройки провайдера.');
        }
        throw new AnyBalance.Error("Не удалось зайти в интернет-банк. Сайт изменился?");
    }

    try{
        html = AnyBalance.requestGet(baseurl + "contracts.aspx");
        
        var reCard = new RegExp('<a[^>]+href=[\'"](card\\.aspx\\?[^\'"]*)[\'"][^>]*>\\s*\\d{4}\\s*XXXX\\s*XXXX\\s*' + (prefs.num ? prefs.num : '\\d{4}'), 'i');
        var href = getParam(html, null, null, reCard, null, html_entity_decode);
        
        if(!href){
            if(prefs.num)
                throw new AnyBalance.Error('Не удалось найти карты с последними цифрами ' + prefs.num);
            else
                throw new AnyBalance.Error('Не удалось найти ни одной карты!');
        }
        
        html = AnyBalance.requestGet(baseurl + href + '&operation=bal');
        
        var result = {success: true};
        
        getParam(html, result, 'cardnum', /номер:\s*<\/label>([^<]*)/i, replaceTagsAndSpaces);
        getParam(html, result, 'currency', /Валюта:\s*<\/label>([^<]*)/i, replaceTagsAndSpaces);
        getParam(html, result, 'cardname', /Наименование:\s*<\/label>([^<]*)/i, replaceTagsAndSpaces);
        getParam(html, result, '__tariff', /Наименование:\s*<\/label>([^<]*)/i, replaceTagsAndSpaces);
        getParam(html, result, 'till', /Срок действия:\s*<\/label>([^<]*)/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'status', /Статус:\s*<\/label>([^<]*)/i, replaceTagsAndSpaces);
        getParam(html, result, 'balance', /Доступные средства:[\s\S]*?<span[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    }finally{
        AnyBalance.requestGet(baseurl + 'logout.aspx');
        AnyBalance.trace("Вышли из системы");
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

