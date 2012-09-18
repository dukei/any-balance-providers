/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Информация о кредите в банке "Русский стандарт".

Сайт: https://online.rsb.ru/
*/

function main() {
    var prefs = AnyBalance.getPreferences();
        var baseurl = 'https://online.rsb.ru/hb/faces/';

	var html = AnyBalance.requestPost(baseurl + 'security_check', {
		j_username: prefs.login,
		login: '',
		j_password: prefs.password,
		pass: '',
		systemid: 'hb'
	  });

	if(!/<a[^>]+class="exit"[^>]*>/.test(html))
	    throw new AnyBalance.Error('Ошибка авторизации. Проверьте логин и пароль');

        if(prefs.type == 'crd')
            fetchCredit(baseurl);
        else if(prefs.type == 'acc')
            fetchAccount(baseurl);
        else if(prefs.type == 'card')
            fetchCard(baseurl);
        else if(prefs.type == 'dep')
            fetchDeposit(baseurl);
        else
            fetchCredit(baseurl); //По умолчанию кредит
}

function fetchCard(baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.contract && !/^\d{4}$/.test(prefs.contract))
        throw new AnyBalance.Error('Пожалуйста, введите 4 последних цифры номера карты, по которой вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первой карте.');

    var html = AnyBalance.requestGet(baseurl + 'rs/cards/RSCardsV2.jspx');

    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<\\/tr>))*\\d{6}\\*{6}' + (prefs.contract ? prefs.contract : '\\d{4}') + '[\\s\\S]*?<\\/tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.contract ? 'карту с последними цифрами ' + prefs.contract : 'ни одной карты'));
    
    var result = {success: true};
    getParam(tr, result, 'currency', /<p[^>]+class="money"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(tr, result, 'account_balance', /<p[^>]+class="money"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
    //Дата окончания срока действия карты
    getParam(tr, result, 'till', /&#1044;&#1072;&#1090;&#1072; &#1086;&#1082;&#1086;&#1085;&#1095;&#1072;&#1085;&#1080;&#1103; &#1089;&#1088;&#1086;&#1082;&#1072; &#1076;&#1077;&#1081;&#1089;&#1090;&#1074;&#1080;&#1103; &#1082;&#1072;&#1088;&#1090;&#1099;\s*-([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseDate);
    //Дата заключения договора
    getParam(tr, result, 'contract_date', /&#1044;&#1072;&#1090;&#1072; &#1079;&#1072;&#1082;&#1083;&#1102;&#1095;&#1077;&#1085;&#1080;&#1103; &#1076;&#1086;&#1075;&#1086;&#1074;&#1086;&#1088;&#1072;\s*-([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseDate);
    //Статус
    getParam(tr, result, 'status', /&#1057;&#1090;&#1072;&#1090;&#1091;&#1089;\s*-([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'contract', /(\d{6}\*{6}\d{4})/, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /<a[^>]+class="xl"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'accname', /<a[^>]+class="xl"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
    
}

function fetchDeposit(baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.contract && !/^\d{10}$/.test(prefs.contract))
        throw new AnyBalance.Error('Пожалуйста, введите 10 цифр номера договора вклада, по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому вкладу.');

    var html = AnyBalance.requestGet(baseurl + 'rs/deposits/RSDeposits.jspx');

    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<\\/tr>))*' + 
       //Номер договора банковского вклада
       '&#1053;&#1086;&#1084;&#1077;&#1088; &#1076;&#1086;&#1075;&#1086;&#1074;&#1086;&#1088;&#1072; &#1073;&#1072;&#1085;&#1082;&#1086;&#1074;&#1089;&#1082;&#1086;&#1075;&#1086; &#1074;&#1082;&#1083;&#1072;&#1076;&#1072;\\s*-\\s*' +
       (prefs.contract ? prefs.contract : '\\d{10}') + '[\\s\\S]*?<\\/tr>)', 'i');

    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.contract ? 'вклад с номером договора ' + prefs.contract : 'ни одного вклада'));
    
    var result = {success: true};
    getParam(tr, result, 'currency', /<p[^>]+class="money"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(tr, result, 'account_balance', /<p[^>]+class="money"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
    //Дата заключения договора банковского вклада
    getParam(tr, result, 'contract_date', /&#1044;&#1072;&#1090;&#1072; &#1079;&#1072;&#1082;&#1083;&#1102;&#1095;&#1077;&#1085;&#1080;&#1103; &#1076;&#1086;&#1075;&#1086;&#1074;&#1086;&#1088;&#1072; &#1073;&#1072;&#1085;&#1082;&#1086;&#1074;&#1089;&#1082;&#1086;&#1075;&#1086; &#1074;&#1082;&#1083;&#1072;&#1076;&#1072;\s*-([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseDate);
    //Статус
       //Номер договора банковского вклада
    getParam(tr, result, 'contract', /&#1053;&#1086;&#1084;&#1077;&#1088; &#1076;&#1086;&#1075;&#1086;&#1074;&#1086;&#1088;&#1072; &#1073;&#1072;&#1085;&#1082;&#1086;&#1074;&#1089;&#1082;&#1086;&#1075;&#1086; &#1074;&#1082;&#1083;&#1072;&#1076;&#1072;\s*-([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /<a[^>]+class="xl"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'accname', /<a[^>]+class="xl"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
    
}

function fetchCredit(baseurl){
    var prefs = AnyBalance.getPreferences();
    if(!prefs.contract) //А вообще неплохо было бы при невводе номера показывать инфу по первому кредиту...
        throw new AnyBalance.Error('Пожалуйста, введите номер договора интересующего вас кредита!');

    var result = {
        success: true
    };

	var html = AnyBalance.requestGet(baseurl + 'rs/credits/RSCredit.jspx');

	var r = new RegExp('<table class="accounts">.+?<p>&#1053;&#1086;&#1084;&#1077;&#1088; &#1082;&#1088;&#1077;&#1076;&#1080;&#1090;&#1072; - '+prefs.contract+'</p>.+?</table>');
	var matches=r.exec(html);

	if(matches==null) throw new AnyBalance.Error('Кредит с указанным номером договора не найден');
	result.contract=prefs.contract;
	html=matches[0];

        getParam(html, result, 'contract_date', /<p>&#1044;&#1072;&#1090;&#1072; &#1079;&#1072;&#1082;&#1083;&#1102;&#1095;&#1077;&#1085;&#1080;&#1103; &#1076;&#1086;&#1075;&#1086;&#1074;&#1086;&#1088;&#1072; - ([0-9.]+)<\/p>/i, replaceTagsAndSpaces, parseDate);

	r = new RegExp('<p>Сумма кредита - ([0-9 ,]+)&nbsp;</p>');
	matches=r.exec(html);
	if(matches!=null) {
		result.credit_sum=parseFloat(matches[1].replace(",",".").replace(" ",""));
	}

	r = new RegExp('<p>Выплачено - ([0-9 ,]+)&nbsp;</p>');
	matches=r.exec(html);
	if(matches!=null) {
		result.paided=parseFloat(matches[1].replace(",",".").replace(" ",""));
	}

	r = new RegExp('<p>Остаток на счёте - ([0-9 ,]+)&nbsp;</p>');
	matches=r.exec(html);
	if(matches!=null) {
		result.account_balance=parseFloat(matches[1].replace(",",".").replace(" ",""));
	}

	r = new RegExp('<div class="desc">&#1044;&#1086; &#1089;&#1087;&#1080;&#1089;&#1099;&#1074;&#1072;&#1085;&#1080;&#1103; &#1087;&#1083;&#1072;&#1090;&#1077;&#1078;&#1072;(?:<span class="warning">) &#1086;&#1089;&#1090;&#1072;&#1083;&#1086;&#1089;&#1100; (\\d+) &#1076;&#1085;');
	matches=r.exec(html);
	if(matches!=null) {
		result.left=parseInt(matches[1]);
	}

	r = new RegExp('<p class="money">([0-9 ,-]+)&nbsp;</p>');
	matches=r.exec(html);
	if(matches!=null) {
		result.credit_balance=parseFloat(matches[1].replace(",",".").replace(" ",""));
	}

	r = new RegExp('<p class="payment">Следующий платеж ([0-9 ,]+)&nbsp;</p>');
	matches=r.exec(html);
	if(matches!=null) {
		result.payment_sum=parseFloat(matches[1].replace(",",".").replace(" ",""));
	}

        getParam(html, result, 'writeoff_date', /<p class="payment">до ([0-9.]+)<a/i, replaceTagsAndSpaces, parseDate);

    AnyBalance.setResult(result);
}

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

var replaceTagsAndSpaces = [/&nbsp;/ig, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var _text = html_entity_decode(text).replace(/\s+/g, '');
    var val = getParam(_text, null, null, /(-?\d[\d\.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseCurrency(text){
    var _text = html_entity_decode(text).replace(/\s+/g, '');
    var val = getParam(_text, null, null, /-?\d[\d\.,]*(?:&nbsp;)?(\S*)/);
    AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
    return val;
}

function parseDate(str){
    AnyBalance.trace('Parsing date from value: ' + str);
    var matches = /(\d+)[^\d](\d+)[^\d](\d+)/.exec(str);
    var time;
    if(matches){
	  time = (new Date(+matches[3], matches[2]-1, +matches[1])).getTime();
    }
    return time;
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

