/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Информация о кредите в банке "Русский стандарт" Украина.

Сайт: https://online.rsb.ua
*/

function main() {
    var prefs = AnyBalance.getPreferences();
        var baseurl = 'https://online.rsb.ua/hb/faces/';

	var html = AnyBalance.requestPost(baseurl + 'security_check', {
		j_username: prefs.login,
		login: '',
		j_password: prefs.password,
		pass: '',
		systemid: 'hb'
	  });

	if(!/id="end_session"/.test(html)){
            if(/Ввод пароля из SMS-сообщения/i.test(html))
	        throw new AnyBalance.Error('У вас настроен вход по паролю из SMS сообщения. Для пользования провайдером необходимо отключить этот пароль в настройках интернет-банка. Это безопасно, для проведения любых операций SMS-пароль всё равно будет требоваться.');
	    throw new AnyBalance.Error('Ошибка авторизации. Проверьте логин и пароль');
        }

        // if(prefs.type == 'crd')
        //     fetchCredit(baseurl);
        // else if(prefs.type == 'acc')
        //     fetchAccount(baseurl);
        // else if(prefs.type == 'card')
            fetchCard(baseurl);
        // else if(prefs.type == 'dep')
        //     fetchDeposit(baseurl);
        // else
        //     fetchCredit(baseurl); //По умолчанию кредит
}

function fetchCard(baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.contract && !/^\d{4}$/.test(prefs.contract))
        throw new AnyBalance.Error('Пожалуйста, введите 4 последних цифры номера карты, по которой вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первой карте.');

    var html = AnyBalance.requestGet(baseurl + 'rs/RSIndex.jspx');

    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S]*?<span[^>]+class="bcrd_number"[^>]*>)\\s*\\d{4}[\\d*]{2}\\*{5,8}<\\/span>\\s*' + (prefs.contract ? prefs.contract : '\\d{4}') + '[\\s\\S]*?<\\/tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.contract ? 'карту с последними цифрами ' + prefs.contract : 'ни одной карты'));
    
    var result = {success: true};
    getParam(tr, result, 'currency', /<p[^>]+class="money"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(tr, result, 'account_balance', /<p[^>]+class="money"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'cardnum', /(<span[^>]+class="bcrd_number"[^>]*>\s*\d{4}[\d*]{2}\*{5,8}\s*<\/span>\s*\d{4})/, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /<a[^>]+class="xl"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'accname', /<a[^>]+class="xl"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);

    var sourceData = getParam(tr, null, null, /<a[^>]+onclick="submitForm[^"]*source:'([^'"]*)'[^"]*"[^>]+class="xl"/i, replaceTagsAndSpaces);
    var token = getParam(html, null, null, /<input[^>]+name="oracle.adf.faces.STATE_TOKEN"[^>]*value="([^"]*)/i, null, html_entity_decode);
   
    if(AnyBalance.isAvailable('contract','gracepay','gracetill')){
        html = AnyBalance.requestPost(baseurl + 'rs/RSIndex.jspx', {
            'oracle.adf.faces.FORM': 'mainform',
            'oracle.adf.faces.STATE_TOKEN': token,
            'source': sourceData
        });
        //Дата заключения договора
        getParam(html, result, 'contract_date', /&#1044;&#1072;&#1090;&#1072; &#1079;&#1072;&#1082;&#1083;&#1102;&#1095;&#1077;&#1085;&#1080;&#1103; &#1076;&#1086;&#1075;&#1086;&#1074;&#1086;&#1088;&#1072;\s*-([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseDate);
        
        //Дата окончания срока действия карты
        getParam(html, result, 'till', /&#1044;&#1072;&#1090;&#1072; &#1086;&#1082;&#1086;&#1085;&#1095;&#1072;&#1085;&#1080;&#1103; &#1089;&#1088;&#1086;&#1082;&#1072; &#1076;&#1077;&#1081;&#1089;&#1090;&#1074;&#1080;&#1103; &#1082;&#1072;&#1088;&#1090;&#1099;\s*-\s*<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDate);
        
        //Статус
        getParam(html, result, 'status', /&#1057;&#1090;&#1072;&#1090;&#1091;&#1089;\s*-([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
        
        //Тип
        getParam(html, result, 'cardtype', /&#1058;&#1080;&#1087;\s*-([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
               
        //Договор № -
        getParam(html, result, 'contract', /&#1044;&#1086;&#1075;&#1086;&#1074;&#1086;&#1088;\s*&#8470;\s*-?([^<]*)/, replaceTagsAndSpaces, html_entity_decode);
        // //Сумма для реализации Льготного периода -
        // getParam(html, result, 'gracepay', /&#1057;&#1091;&#1084;&#1084;&#1072; &#1076;&#1083;&#1103; &#1088;&#1077;&#1072;&#1083;&#1080;&#1079;&#1072;&#1094;&#1080;&#1080; &#1051;&#1100;&#1075;&#1086;&#1090;&#1085;&#1086;&#1075;&#1086; &#1087;&#1077;&#1088;&#1080;&#1086;&#1076;&#1072;\s*-?([^<]*)/, replaceTagsAndSpaces, parseBalance);
        // //Дата окончания Льготного периода -
        // getParam(html, result, 'gracetill', /&#1044;&#1072;&#1090;&#1072; &#1086;&#1082;&#1086;&#1085;&#1095;&#1072;&#1085;&#1080;&#1103; &#1051;&#1100;&#1075;&#1086;&#1090;&#1085;&#1086;&#1075;&#1086; &#1087;&#1077;&#1088;&#1080;&#1086;&#1076;&#1072;\s*-?([^<]*)/, replaceTagsAndSpaces, parseDate);
    }

    AnyBalance.setResult(result);    
}

// function fetchAccount(baseurl){
//     var prefs = AnyBalance.getPreferences();
//     if(prefs.contract && !/^\d{4,20}$/.test(prefs.contract))
//         throw new AnyBalance.Error('Пожалуйста, введите не менее 4 последних цифр номера счета, по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому счету.');

//     var html = AnyBalance.requestGet(baseurl + 'rs/accounts/RSAccounts.jspx');

//     //Сколько цифр осталось, чтобы дополнить до 20
//     var accnum = prefs.contract || '';
//     var accprefix = accnum.length;
//     accprefix = 20 - accprefix;

//     var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<\\/tr>))*' + (accprefix > 0 ? '\\d{' + accprefix + '}' : '') + accnum + '\\s*<[\\s\\S]*?<\\/tr>)', 'i');
//     var tr = getParam(html, null, null, re);
//     if(!tr)
//         throw new AnyBalance.Error('Не удаётся найти ' + (prefs.contract ? 'счет с последними цифрами ' + prefs.contract : 'ни одного счета'));
    
//     var result = {success: true};
//     getParam(tr, result, 'currency', /<p[^>]+class="money"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseCurrency);
//     getParam(tr, result, 'account_balance', /<p[^>]+class="money"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
//     //Статус
//     getParam(tr, result, 'status', /&#1057;&#1086;&#1089;&#1090;&#1086;&#1103;&#1085;&#1080;&#1077;\s*-([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
//     getParam(tr, result, 'cardnum', /(\d{20})/, replaceTagsAndSpaces, html_entity_decode);
//     getParam(tr, result, '__tariff', /<a[^>]+class="xl"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
//     getParam(tr, result, 'accname', /<a[^>]+class="xl"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);

//     /* Работает, но получать тарифный план, наверное, смысла нет

//     var sourceData = getParam(tr, null, null, /<a[^>]+onclick="submitForm[^"]*source:'([^'"]*)'[^"]*"[^>]+class="xl"/i, replaceTagsAndSpaces);
//     var token = getParam(html, null, null, /<input[^>]+name="oracle.adf.faces.STATE_TOKEN"[^>]*value="([^"]*)/i, null, html_entity_decode);

//     if(AnyBalance.isAvailable('contract')){
//         html = AnyBalance.requestPost(baseurl + 'rs/accounts/RSAccounts.jspx', {
//             'oracle.adf.faces.FORM': 'mainform',
//             'oracle.adf.faces.STATE_TOKEN': token,
//             'source': sourceData
//         });
//         //Тарифный план - №
//         getParam(html, result, 'contract', /&#1058;&#1072;&#1088;&#1080;&#1092;&#1085;&#1099;&#1081; &#1087;&#1083;&#1072;&#1085;\s*-?\s*([^<]*)/, replaceTagsAndSpaces, html_entity_decode);
//     }
//     */
//     AnyBalance.setResult(result);
    
// }

// function fetchDeposit(baseurl){
//     var prefs = AnyBalance.getPreferences();
//     if(prefs.contract && !/^\d{10}$/.test(prefs.contract))
//         throw new AnyBalance.Error('Пожалуйста, введите 10 цифр номера договора вклада, по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому вкладу.');

//     var html = AnyBalance.requestGet(baseurl + 'rs/deposits/RSDeposits.jspx');

//     var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<\\/tr>))*' + 
//        //Номер договора банковского вклада
//        '&#1053;&#1086;&#1084;&#1077;&#1088; &#1076;&#1086;&#1075;&#1086;&#1074;&#1086;&#1088;&#1072; &#1073;&#1072;&#1085;&#1082;&#1086;&#1074;&#1089;&#1082;&#1086;&#1075;&#1086; &#1074;&#1082;&#1083;&#1072;&#1076;&#1072;\\s*-\\s*' +
//        (prefs.contract ? prefs.contract : '\\d{10}') + '[\\s\\S]*?<\\/tr>)', 'i');

//     var tr = getParam(html, null, null, re);
//     if(!tr)
//         throw new AnyBalance.Error('Не удаётся найти ' + (prefs.contract ? 'вклад с номером договора ' + prefs.contract : 'ни одного вклада'));
    
//     var result = {success: true};
//     getParam(tr, result, 'currency', /<p[^>]+class="money"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseCurrency);
//     getParam(tr, result, 'account_balance', /<p[^>]+class="money"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
//     //Дата заключения договора банковского вклада
//     getParam(tr, result, 'contract_date', /&#1044;&#1072;&#1090;&#1072; &#1079;&#1072;&#1082;&#1083;&#1102;&#1095;&#1077;&#1085;&#1080;&#1103; &#1076;&#1086;&#1075;&#1086;&#1074;&#1086;&#1088;&#1072; &#1073;&#1072;&#1085;&#1082;&#1086;&#1074;&#1089;&#1082;&#1086;&#1075;&#1086; &#1074;&#1082;&#1083;&#1072;&#1076;&#1072;\s*-([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseDate);
//     //Статус
//        //Номер договора банковского вклада
//     getParam(tr, result, 'contract', /&#1053;&#1086;&#1084;&#1077;&#1088; &#1076;&#1086;&#1075;&#1086;&#1074;&#1086;&#1088;&#1072; &#1073;&#1072;&#1085;&#1082;&#1086;&#1074;&#1089;&#1082;&#1086;&#1075;&#1086; &#1074;&#1082;&#1083;&#1072;&#1076;&#1072;\s*-([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
//     getParam(tr, result, '__tariff', /<a[^>]+class="xl"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
//     getParam(tr, result, 'accname', /<a[^>]+class="xl"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);

//     AnyBalance.setResult(result);
    
// }

// function fetchCredit(baseurl){
//     var prefs = AnyBalance.getPreferences();

//     if(prefs.contract && !/^\d{6,10}$/.test(prefs.contract))
//         throw new AnyBalance.Error('Пожалуйста, введите номер кредита, по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому кредиту.');

//     var html = AnyBalance.requestGet(baseurl + 'rs/credits/RSCredit.jspx');

//     var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<\\/tr>))*' + 
//        //Номер кредита
//        '&#1053;&#1086;&#1084;&#1077;&#1088; &#1082;&#1088;&#1077;&#1076;&#1080;&#1090;&#1072;\\s*-\\s*' +
//        (prefs.contract ? prefs.contract : '\\d{10}') + '[\\s\\S]*?<\\/tr>)', 'i');

//     var tr = getParam(html, null, null, re);
//     if(!tr)
//         throw new AnyBalance.Error('Не удаётся найти ' + (prefs.contract ? 'кредит с номером ' + prefs.contract : 'ни одного кредита'));

//     var result = {success: true};

//     //Номер кредита
//     getParam(tr, result, 'contract', /&#1053;&#1086;&#1084;&#1077;&#1088; &#1082;&#1088;&#1077;&#1076;&#1080;&#1090;&#1072;\s*-([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);

//     getParam(tr, result, 'contract_date', /<p>&#1044;&#1072;&#1090;&#1072; &#1079;&#1072;&#1082;&#1083;&#1102;&#1095;&#1077;&#1085;&#1080;&#1103; &#1076;&#1086;&#1075;&#1086;&#1074;&#1086;&#1088;&#1072;\s*-([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseDate);
//     getParam(tr, result, 'credit_sum', /<p>Сумма кредита\s*-([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
//     getParam(tr, result, 'paided', /<p>Выплачено\s*-([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
//     getParam(tr, result, 'account_balance', /<p>Остаток на счёте\s*-([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
//     //До списывания платежа осталось
//     getParam(tr, result, 'left', /&#1044;&#1086; &#1089;&#1087;&#1080;&#1089;&#1099;&#1074;&#1072;&#1085;&#1080;&#1103; &#1087;&#1083;&#1072;&#1090;&#1077;&#1078;&#1072;\s*(?:<[^>]*>\s*)*&#1086;&#1089;&#1090;&#1072;&#1083;&#1086;&#1089;&#1100;\s*(\d+)\s*&#1076;&#1085;/i, replaceTagsAndSpaces, parseBalance);
//     getParam(tr, result, 'credit_balance', /<p[^>]*class="money"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
//     getParam(tr, result, 'payment_sum', /Следующий платеж([^<]*)/i, replaceTagsAndSpaces, parseBalance);
//     getParam(tr, result, 'writeoff_date', /<p class="payment">до ([0-9.]+)<a/i, replaceTagsAndSpaces, parseDate);

//     AnyBalance.setResult(result);
// }

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
    var matches = /(?:(\d+)[^\d])?(\d+)[^\d](\d{4})/.exec(str);
    var time;
    if(matches){
	  time = (new Date(+matches[3], matches[2]-1, +(matches[1] || 1))).getTime();
          AnyBalance.trace('Parsing date ' + new Date(time) + ' from value: ' + str);
          return time;
    }
    AnyBalance.trace('Could not parse date from value: ' + str);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

