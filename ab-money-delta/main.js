/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт банка Дельта банк

Сайт оператора: http://deltabank.com.ua/
Личный кабинет: https://online.deltabank.com.ua
*/

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

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function getEventValidation(html){
    return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/);
}

var g_headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
}


function main(){
    var prefs = AnyBalance.getPreferences();

    var prefs = AnyBalance.getPreferences();
    if(prefs.accnum && !/^\d{4,}$/.test(prefs.accnum))
        throw new AnyBalance.Error("Введите не меньше 4 последних цифр номера счета или не вводите ничего, чтобы показать информацию по первому счету.");

    var baseurl = prefs.login != '1' ? "https://online.deltabank.com.ua/" : "https://online.deltabank.com.ua/DEMO/";
    
    var html = AnyBalance.requestGet(baseurl + 'Pages/User/LogOn.aspx', g_headers);
    var viewstate = getViewState(html);
    var eventvalidation = getEventValidation(html);

    html = AnyBalance.requestPost(baseurl + 'Pages/User/LogOn.aspx', {
        __EVENTTARGET: '',
        __EVENTARGUMENT:'',
        __VIEWSTATE:viewstate,
        __VIEWSTATEENCRYPTED:'',
        __EVENTVALIDATION:eventvalidation,
        wzLogin$tbLogin:prefs.login,
        wzLogin$tbPassword:prefs.password,
        'wzLogin$btnLogOn.x':54,
        'wzLogin$btnLogOn.y':10,
        wzLogin$logOn_Step1$divLogin$txtLogin:prefs.login,
        wzLogin$logOn_Step1$divLogin$txtPass:prefs.password,
        'wzLogin$logOn_Step1$divLogin$btnLogin.x':77,
        'wzLogin$logOn_Step1$divLogin$btnLogin.y':13
    }, g_headers);

    if(!/ctl00\$btnLogout/i.test(html)){
        var error = getParam(html, null, null, /<span[^>]+id="overlayingErrorMessage_lblMessage">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось зайти в интернет-банк. Сайт изменен?");
    }

    //Сколько цифр осталось, чтобы дополнить до 16
    var accnum = prefs.accnum || '';
    var accprefix = accnum.length;
    accprefix = 12 - accprefix;

    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<\\/tr>))*?>\\s*' + (accprefix > 0 ? '\\d{' + accprefix + ',}' : '') + accnum + '\\s+[\\s\\S]*?<\\/tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (accnum ? 'счет с последними цифрами ' + accnum : 'ни одного счета'));

    var result = {success: true};
    var type = getParam(tr, null, null, /<input[^>]*name="([^"]*)/i);
   
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){3}(?:\s*<[^>]*>)*\s*(\d+)/i, replaceTagsAndSpaces);
    getParam(tr, result, 'accname', /(?:[\s\S]*?<td[^>]*>){3}(?:\s*<[^>]*>)*\s*\d+([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

    switch(type){
    case 'CurrentAccount':
    case 'DebitAccount':
        getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
        break;
    case 'CreditAccount':
        getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
        getParam(tr, result, 'limit', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        break;
    case 'Deposit':
        getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
        getParam(tr, result, 'till', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        break;
    case 'Loan':
        getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
        getParam(tr, result, 'pay', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(tr, result, 'paytill', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        break;
    }

    if(AnyBalance.isAvailable('agreement', 'pct', 'monthlypay', 'debt', 'pay', 'paytill')){
        var nametd = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i);
        var id = getParam(nametd || '', null, null, /__doPostBack\s*\(\s*'([^']*)/i);
        if(id){
            html = AnyBalance.requestPost(baseurl + 'Pages/User/MainPage.aspx', {
                __EVENTTARGET: id,
                __EVENTARGUMENT: '',
                __VIEWSTATE: getViewState(html),
                __VIEWSTATEENCRYPTED: '',
                __PREVIOUSPAGE: getParam(html, null, null, /name="__PREVIOUSPAGE"[^>]*value="([^"]*)/i),
                __EVENTVALIDATION: getEventValidation(html)
            }, g_headers);
        
            getParam(html, result, 'agreement', /Номер\s+договора[\s\S]*?<div[^>]+class="value"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
            getParam(html, result, 'pct', /Процентная ставка[\s\S]*?<div[^>]+class="value"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'monthlypay', /Ежемесячный платеж[\s\S]*?<div[^>]+class="value"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'debt', /Остаток задолженности[\s\S]*?<div[^>]+class="value"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
        
            getParam(html, result, 'pay', /Будущий обязательный платеж[\s\S]*?<div[^>]+class="value"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'paytill', /Дата будущего платежа[\s\S]*?<div[^>]+class="value"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
            getParam(html, result, 'debt', /Общая задолженность[\s\S]*?<div[^>]+class="value"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
        }else{
            AnyBalance.trace('Не удалось получить ссылку на подробные сведения о счете');
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

