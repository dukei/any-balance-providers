/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт Банка Авангард через интернет банк.

Сайт оператора: http://www.avangard.ru/
Личный кабинет: https://www.avangard.ru/login/logon_enter.html
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

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.', /(\d)\-(\d)/g, '$1.$2'];

function parseBalance(text){
    var _text = text.replace(/\s+/g, '');
    var val = getParam(_text, null, null, /(-?\d[\d\.,\-]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

var replaceFloat2 = [/\s+/g, '', /,/g, '', /(\d)\-(\d)/g, '$1.$2'];

function parseBalance2(text){
    var _text = text.replace(/\s+/g, '');
    var val = getParam(_text, null, null, /(-?\d[\d\.,\-]*)/, replaceFloat2, parseFloat);
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
    var time;
    if(matches){
	  time = (new Date(+matches[3], matches[2]-1, +matches[1])).getTime();
    }
    AnyBalance.trace('Parsing date ' + new Date(time) + ' from value: ' + str);
    return time;
}

var g_phrases = {
   karty: {card: 'карты', acc: 'счета'},
   kartu: {card: 'карту', acc: 'счет'},
   karte1: {card: 'первой карте', acc: 'первому счету'},
   karty1: {card: 'одной карты', acc: 'одного счета'}
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://www.avangard.ru/";
    AnyBalance.setDefaultCharset("windows-1251");
    
    var what = prefs.what || 'card';
    if(prefs.num && !/\d{4}/.test(prefs.num))
        throw new AnyBalance.Error("Введите 4 последних цифры номера " + g_phrases.karty[what] + " или не вводите ничего, чтобы показать информацию по " + g_phrases.karte1[what]);

    var html = AnyBalance.requestPost(baseurl + "client4/afterlogin", {
        login:prefs.login,
        passwd:prefs.password,
        x:38,
        y:6,
    });

    var error = getParam(html, null, null, /<!--WAS_ERROR-->([\s\S]*?)<!--\/WAS_ERROR-->/i, replaceTagsAndSpaces);
    if(error)
        throw new AnyBalance.Error(error);

    var firstpage = getParam(html, null, null, /window.location\s*=\s*"([^"]*)"/i);
    if(!firstpage)
        throw new AnyBalance.Error("Не удалось найти ссылку на первую страницу банка.");

    AnyBalance.trace("We seem to enter the bank...");

    html = AnyBalance.requestGet(baseurl + "ibAvn/" + firstpage);

    var pattern = null;
    if(what == 'card')
        pattern = new RegExp('(\\d+\\*{6}' + (prefs.num || '\\d{4}') + ')');
    else
        pattern = new RegExp(prefs.num ? '(\\d{16}'+prefs.num+')' : '(\\d{20})');

    $html = $(html);
    var acccardnum = null;

    var $acc = $html.find('table[width="700"]').filter(function(i){
        var matches = pattern.exec($(this).text());
        if(matches && !acccardnum)
            acccardnum = matches[1];
        return !!matches;
    }).first();

    if(!$acc.size()){
        if(prefs.num)
            throw new AnyBalance.Error('Не удалось найти ' + g_phrases.kartu[what] + ' с последними цифрами ' + prefs.num);
        else
            throw new AnyBalance.Error('Не удалось найти ни ' + g_phrases.karty1[what] + '!');
    }

    var result = {success: true};

    getParam($acc.find('a.xl').text(), result, 'accnum', /(\d{20})/);
    getParam($acc.find('a.xl').text(), result, '__tariff', /(\d{20})/);
    getParam($acc.find('tr:has(a.xl)').text(), result, 'accname', /([\S\s]*?)\d{20}/, replaceTagsAndSpaces);
    getParam($acc.find('tr:first-child td:last-child b').text(), result, 'balance', null, replaceTagsAndSpaces, parseBalance);
    var balance = getParam($acc.find('tr:first-child td:last-child b').text(), null, null, null, replaceTagsAndSpaces, parseBalance);
    getParam($acc.find('tr:first-child td:last-child b').text(), result, 'currency', null, replaceTagsAndSpaces, parseCurrency);

    if(what == 'card'){
        var $card = $acc.find('table.cardListTable tr:contains("' + acccardnum + '")').first();
        if($card.size()){
            getParam($card.find('td:nth-child(2)').text(), result, 'cardnum', null, replaceTagsAndSpaces);
            getParam($card.find('td:nth-child(2)').text(), result, '__tariff', null, replaceTagsAndSpaces);
            getParam($card.find('td:nth-child(3)').text(), result, 'cardname', null, replaceTagsAndSpaces);
            getParam($card.find('td:nth-child(4)').text(), result, 'cardtill', null, replaceTagsAndSpaces);
            getParam($card.find('td:nth-child(5)').text(), result, 'cardtype', null, replaceTagsAndSpaces);
            getParam($card.find('td:nth-child(6)').text(), result, 'cardstatus', null, replaceTagsAndSpaces);
        }
    }

    if(AnyBalance.isAvailable('limit', 'minpay', 'minpaydate', 'freepay', 'freepaydate', 'debt')){
       //{source:'f:_id164:0:_id180'}
       var source = getParam($acc.find('a.xl').attr('onclick'), null, null, /\{source:'([^']*)/i);
       //<input type="hidden" name="oracle.adf.faces.STATE_TOKEN" value="-118qdrmfn5">
       var token = getParam(html, null, null, /<input[^>]*name="oracle\.adf\.faces\.STATE_TOKEN"[^>]*value="([^"]*)/i);
       if(source && token){
//            AnyBalance.setCookie('www.avangard.ru', 'oracle.uix', '0^^GMT+4:00');
//            AnyBalance.setCookie('www.avangard.ru', 'xscroll-faces/pages/accounts/all_acc.jspx', '0:1354528466127');
//            AnyBalance.setCookie('www.avangard.ru', 'yscroll-faces/pages/accounts/all_acc.jspx', '0:1354528466130');

            html = AnyBalance.requestPost(baseurl + 'ibAvn/faces/pages/accounts/all_acc.jspx', {
                'oracle.adf.faces.FORM':'f',
                'oracle.adf.faces.STATE_TOKEN': token,
                source: source
            }/*, {Referer: 'https://www.avangard.ru/ibAvn/faces/pages/accounts/all_acc.jspx'}*/);
       
            //До 31.08.2012 для уплаты минимального платежа необходимо внести 1,675.05 RUR     
            //&#1044;&#1086; 31.08.2012 &#1076;&#1083;&#1103; &#1091;&#1087;&#1083;&#1072;&#1090;&#1099; &#1084;&#1080;&#1085;&#1080;&#1084;&#1072;&#1083;&#1100;&#1085;&#1086;&#1075;&#1086; &#1087;&#1083;&#1072;&#1090;&#1077;&#1078;&#1072; &#1085;&#1077;&#1086;&#1073;&#1093;&#1086;&#1076;&#1080;&#1084;&#1086; &#1074;&#1085;&#1077;&#1089;&#1090;&#1080; 1,675.05 RUR
            getParam(html, result, 'minpaydate', /&#1044;&#1086;\s*([\d\.]+)\s*&#1076;&#1083;&#1103; &#1091;&#1087;&#1083;&#1072;&#1090;&#1099; &#1084;&#1080;&#1085;&#1080;&#1084;&#1072;&#1083;&#1100;&#1085;&#1086;&#1075;&#1086; &#1087;&#1083;&#1072;&#1090;&#1077;&#1078;&#1072; &#1085;&#1077;&#1086;&#1073;&#1093;&#1086;&#1076;&#1080;&#1084;&#1086; &#1074;&#1085;&#1077;&#1089;&#1090;&#1080;/i, null, parseDate);
            getParam(html, result, 'minpay', /&#1044;&#1086;\s*[\d\.]+\s*&#1076;&#1083;&#1103; &#1091;&#1087;&#1083;&#1072;&#1090;&#1099; &#1084;&#1080;&#1085;&#1080;&#1084;&#1072;&#1083;&#1100;&#1085;&#1086;&#1075;&#1086; &#1087;&#1083;&#1072;&#1090;&#1077;&#1078;&#1072; &#1085;&#1077;&#1086;&#1073;&#1093;&#1086;&#1076;&#1080;&#1084;&#1086; &#1074;&#1085;&#1077;&#1089;&#1090;&#1080;([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
            //Кредитный лимит
            getParam(html, result, 'limit', /&#1050;&#1088;&#1077;&#1076;&#1080;&#1090;&#1085;&#1099;&#1081; &#1083;&#1080;&#1084;&#1080;&#1090;:[\s\S]*?<td[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
            var limit = getParam(html, null, null, /&#1050;&#1088;&#1077;&#1076;&#1080;&#1090;&#1085;&#1099;&#1081; &#1083;&#1080;&#1084;&#1080;&#1090;:[\s\S]*?<td[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
            //Для выполнения условия льготного периода Вы можете внести сумму в размере 14,656.58 RUR по 20.08.2012 включительно
            //&#1044;&#1083;&#1103; &#1074;&#1099;&#1087;&#1086;&#1083;&#1085;&#1077;&#1085;&#1080;&#1103; &#1091;&#1089;&#1083;&#1086;&#1074;&#1080;&#1103; &#1083;&#1100;&#1075;&#1086;&#1090;&#1085;&#1086;&#1075;&#1086; &#1087;&#1077;&#1088;&#1080;&#1086;&#1076;&#1072; &#1042;&#1099; &#1084;&#1086;&#1078;&#1077;&#1090;&#1077; &#1074;&#1085;&#1077;&#1089;&#1090;&#1080; &#1089;&#1091;&#1084;&#1084;&#1091; &#1074; &#1088;&#1072;&#1079;&#1084;&#1077;&#1088;&#1077; 14,656.58 RUR &#1087;&#1086; 20.08.2012
            getParam(html, result, 'freepaydate', /&#1044;&#1083;&#1103; &#1074;&#1099;&#1087;&#1086;&#1083;&#1085;&#1077;&#1085;&#1080;&#1103; &#1091;&#1089;&#1083;&#1086;&#1074;&#1080;&#1103; &#1083;&#1100;&#1075;&#1086;&#1090;&#1085;&#1086;&#1075;&#1086; &#1087;&#1077;&#1088;&#1080;&#1086;&#1076;&#1072; &#1042;&#1099; &#1084;&#1086;&#1078;&#1077;&#1090;&#1077; &#1074;&#1085;&#1077;&#1089;&#1090;&#1080; &#1089;&#1091;&#1084;&#1084;&#1091; &#1074; &#1088;&#1072;&#1079;&#1084;&#1077;&#1088;&#1077;[^<]*?&#1087;&#1086;\s*([\d\.]+)/i, null, parseDate);
            getParam(html, result, 'freepay', /&#1044;&#1083;&#1103; &#1074;&#1099;&#1087;&#1086;&#1083;&#1085;&#1077;&#1085;&#1080;&#1103; &#1091;&#1089;&#1083;&#1086;&#1074;&#1080;&#1103; &#1083;&#1100;&#1075;&#1086;&#1090;&#1085;&#1086;&#1075;&#1086; &#1087;&#1077;&#1088;&#1080;&#1086;&#1076;&#1072; &#1042;&#1099; &#1084;&#1086;&#1078;&#1077;&#1090;&#1077; &#1074;&#1085;&#1077;&#1089;&#1090;&#1080; &#1089;&#1091;&#1084;&#1084;&#1091; &#1074; &#1088;&#1072;&#1079;&#1084;&#1077;&#1088;&#1077;([^<]*?)&#1087;&#1086;/i, replaceTagsAndSpaces, parseBalance2);

            if(AnyBalance.isAvailable('debt') && limit){
                result.debt = limit - balance; //Задолженность
            }
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

