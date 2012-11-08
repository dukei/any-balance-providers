/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт и счетов Банка Ренессанс Кредит

Сайт оператора: http://rencredit.ru/
Личный кабинет: https://online.rencredit.ru
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
    var _text = html_entity_decode(text.replace(/\s+/g, ''));
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
    'Accept-Language': 'ru, en',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
}

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://online.rencredit.ru/hb/";
    
    var html = AnyBalance.requestGet(baseurl + 'faces/renk/login.jsp', g_headers);
    var formid = getParam(html, null, null, /<input[^>]+name="last_form_id"[^>]*value="([^"]*)/i);
    if(!formid)
        throw new AnyBalance.Error('Не удаётся найти форму входа. Сайт изменен?');

    var html = AnyBalance.requestPost(baseurl + 'system/security_check', {
        j_username:prefs.login,
        j_password:prefs.password,
        systemid:'hb',
        last_form_id:formid,
        form_submitted:''
    }, g_headers);

    if(!/but_exit\.gif/i.test(html)){
        throw new AnyBalance.Error('Не удалось зайти в интернет-банк. Неправильный логин-пароль?');
    }

    if(prefs.type == 'card')
        fetchCard(html, baseurl);
    else if(prefs.type == 'acc')
        fetchAccount(html, baseurl);
    else
        fetchCard(html, baseurl); //По умолчанию карты будем получать
}

function fetchCard(html, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
        throw new AnyBalance.Error('Пожалуйста, введите 4 последних цифры номера карты, по которой вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первой карте.');

    var html = AnyBalance.requestGet(baseurl + 'faces/renk/cards/CardList.jspx', g_headers);

    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<\\/tr>))*\\d{4}\\*{7,8}' + (prefs.cardnum ? prefs.cardnum : '\\d{4}') + '[\\s\\S]*?<\\/tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.cardnum ? 'карту с последними цифрами ' + prefs.cardnum : 'ни одной карты'));
    
    var result = {success: true};

    var sourceData = getParam(tr, null, null, /<a[^>]+onclick="submitForm[^"]*source:'([^'"]*)'[^"]*"[^>]+class="xl"/i, replaceTagsAndSpaces);
    var token = getParam(html, null, null, /<input[^>]+name="oracle.adf.faces.STATE_TOKEN"[^>]*value="([^"]*)/i, null, html_entity_decode);
   
    html = AnyBalance.requestPost(baseurl + 'faces/renk/cards/CardList.jspx', {
        'oracle.adf.faces.FORM': 'mainform',
        'oracle.adf.faces.STATE_TOKEN': token,
        'source': sourceData
    }, g_headers);

    //Номер карты
    getParam(html, result, 'cardnum', /&#1053;&#1086;&#1084;&#1077;&#1088; &#1082;&#1072;&#1088;&#1090;&#1099;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    //Номер карты
    getParam(html, result, '__tariff', /&#1053;&#1086;&#1084;&#1077;&#1088; &#1082;&#1072;&#1088;&#1090;&#1099;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    //ФИО держателя карты
    getParam(html, result, 'userName', /&#1060;&#1048;&#1054; &#1076;&#1077;&#1088;&#1078;&#1072;&#1090;&#1077;&#1083;&#1103; &#1082;&#1072;&#1088;&#1090;&#1099;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    //Номер карточного договора
    getParam(html, result, 'contract', /&#1053;&#1086;&#1084;&#1077;&#1088; &#1082;&#1072;&#1088;&#1090;&#1086;&#1095;&#1085;&#1086;&#1075;&#1086; &#1076;&#1086;&#1075;&#1086;&#1074;&#1086;&#1088;&#1072;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    //>Счет<
    getParam(html, result, 'accnum', />\s*&#1057;&#1095;&#1077;&#1090;\s*<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    //Размер кредитного лимита по карте
    getParam(html, result, 'limit', /&#1056;&#1072;&#1079;&#1084;&#1077;&#1088; &#1082;&#1088;&#1077;&#1076;&#1080;&#1090;&#1085;&#1086;&#1075;&#1086; &#1083;&#1080;&#1084;&#1080;&#1090;&#1072; &#1087;&#1086; &#1082;&#1072;&#1088;&#1090;&#1077;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    //Доступный лимит
    getParam(html, result, 'balance', /&#1044;&#1086;&#1089;&#1090;&#1091;&#1087;&#1085;&#1099;&#1081; &#1083;&#1080;&#1084;&#1080;&#1090;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    //Статус карты
    getParam(html, result, 'status', /&#1057;&#1090;&#1072;&#1090;&#1091;&#1089; &#1082;&#1072;&#1088;&#1090;&#1099;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('minpay', 'minpaytill', 'currency')){
        //Минимальный платеж
        var sourceData = getParam(html, null, null, /<a[^>]+onclick="submitForm[^"]*source:'([^'"]*)'[^>]*>\s*&#1052;&#1080;&#1085;&#1080;&#1084;&#1072;&#1083;&#1100;&#1085;&#1099;&#1081; &#1087;&#1083;&#1072;&#1090;&#1077;&#1078;/i, replaceTagsAndSpaces);
        var token = getParam(html, null, null, /<input[^>]+name="oracle.adf.faces.STATE_TOKEN"[^>]*value="([^"]*)/i, null, html_entity_decode);
        if(!sourceData || !token){
            AnyBalance.trace('Не удаётся найти ссылку на минимальный платеж по карте.');
        }else{
            html = AnyBalance.requestPost(baseurl + 'faces/renk/cards/CardDetails.jspx', {
                'oracle.adf.faces.FORM': 'mainform',
                'oracle.adf.faces.STATE_TOKEN': token,
                'source': sourceData
            }, g_headers);

            //Сумма погашения
            getParam(html, result, 'minpay', /&#1057;&#1091;&#1084;&#1084;&#1072; &#1087;&#1086;&#1075;&#1072;&#1096;&#1077;&#1085;&#1080;&#1103;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            //Сумма погашения
            getParam(html, result, 'currency', /&#1057;&#1091;&#1084;&#1084;&#1072; &#1087;&#1086;&#1075;&#1072;&#1096;&#1077;&#1085;&#1080;&#1103;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
            //Поступление платежа на счет не позднее
            getParam(html, result, 'minpaytill', /&#1055;&#1086;&#1089;&#1090;&#1091;&#1087;&#1083;&#1077;&#1085;&#1080;&#1077; &#1087;&#1083;&#1072;&#1090;&#1077;&#1078;&#1072; &#1085;&#1072; &#1089;&#1095;&#1077;&#1090; &#1085;&#1077; &#1087;&#1086;&#1079;&#1076;&#1085;&#1077;&#1077;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        }
    }

    AnyBalance.setResult(result);
}

function fetchAccount(html, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4,20}$/.test(prefs.cardnum))
        throw new AnyBalance.Error('Пожалуйста, введите не менее 4 последних цифр номера счета, по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому счету.');

    //Она сразу сюда приходит, можно явно не переходить
    //var html = AnyBalance.requestGet(baseurl + 'aces/renk/accounts/AccountList.jspx', g_headers);

    //Сколько цифр осталось, чтобы дополнить до 20
    var accnum = prefs.cardnum || '';
    var accprefix = accnum.length;
    accprefix = 20 - accprefix;

    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<\\/tr>))*' + (accprefix > 0 ? '\\d{' + accprefix + '}' : '') + accnum + '\\s*<[\\s\\S]*?<\\/tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.cardnum ? 'счет с последними цифрами ' + prefs.cardnum : 'ни одного счета'));
    
    var result = {success: true};
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'available', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'accnum', /(\d{20})/, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /(\d{20})/, replaceTagsAndSpaces, html_entity_decode);

    var sourceData = getParam(tr, null, null, /<a[^>]+onclick="submitForm[^"]*source:'([^'"]*)'[^"]*"[^>]+class="xl"/i, replaceTagsAndSpaces);
    var token = getParam(html, null, null, /<input[^>]+name="oracle.adf.faces.STATE_TOKEN"[^>]*value="([^"]*)/i, null, html_entity_decode);

    if(AnyBalance.isAvailable('accname', 'userName')){
        html = AnyBalance.requestPost(baseurl + 'faces/renk/accounts/AccountList.jspx', {
            'oracle.adf.faces.FORM': 'mainform',
            'oracle.adf.faces.STATE_TOKEN': token,
            'source': sourceData
        }, g_headers);
        //Тип счета
        getParam(html, result, 'accname', /&#1058;&#1080;&#1087; &#1089;&#1095;&#1077;&#1090;&#1072;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        //ФИО владельца счета
        getParam(html, result, 'userName', /&#1060;&#1048;&#1054; &#1074;&#1083;&#1072;&#1076;&#1077;&#1083;&#1100;&#1094;&#1072; &#1089;&#1095;&#1077;&#1090;&#1072;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
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

