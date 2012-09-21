/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт Альфабанка, используя большой Альфа-клик.

Сайт оператора: http://alfabank.ru/
Личный кабинет: https://m.alfabank.ru/
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

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var _text = text.replace(/\s+/g, '');
    var val = getParam(_text, null, null, /(-?\d[\d\.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseCurrency(text){
    var _text = text.replace(/\s+/g, '');
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

function main(){
    var prefs = AnyBalance.getPreferences();
    if(prefs.usemobile)
        processMobile();
    else
        processClick();
}

var g_phrases = {
   karty: {card: 'карты', credit: 'кредитного счета'},
   karte1: {card: 'первой карте', credit: 'первому счету'}
}

var g_headers = {
  'Accept':'*/*',
   'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
   'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
   'Connection':'keep-alive',
   'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.89 Safari/537.1'
};

function addHeaders(newHeaders){
   var headers = {};
   for(var i in g_headers){
       headers[i] = g_headers[i];
   }
   for(i in newHeaders){
       headers[i] = newHeaders[i];
   }
   return headers;
}

function createParams(params){
   var ret = {};
   for(var i=0; i<params.length; ++i){
       if(!params[i])
           continue;
       ret[params[i][0]] = params[i][1]; 
   }
   return ret;
}

var g_wasMainPage = false;
function getMainPageOrModule(html, type, baseurl){
   var commands = {
       card: 'MCD__cardlist',
       acc: 'MAC__accountlist',
       dep: 'MDP__depositlist',
       crd: 'MCR__credits' 
   };

   var action = getParam(html, null, null, /<form[^>]*name="f1"[^>]*action="\/(ALFAIBSR[^"]*)/i, null, html_entity_decode);
   if(!action)
       throw new AnyBalance.Error('Не удаётся найти форму ввода команды. Сайт изменен?');
   var viewstate = getParam(html, null, null, /<input[^>]*name="javax.faces.ViewState"[^>]*value="([^"]*)/i, null, html_entity_decode);
   if(!viewstate)
       throw new AnyBalance.Error('Не удаётся найти ViewState. Сайт изменен?');

   if(!g_wasMainPage){
      var paramsMainPage = createParams([
         ['pt1:r1:0:dt1:rangeStart', '0'],
         ['pt1:r4:0:table1:rangeStart', '0'],
         ['pt1:r2:0:t1:rangeStart', '0'],
         ['org.apache.myfaces.trinidad.faces.FORM', 'f1'],
         ['javax.faces.ViewState', viewstate],
         ['oracle.adf.view.rich.RENDER', 'pt1:ATP1_r1'],
         ['event', 'pt1:ATP1_r1:0:' + commands[type]],
         ['event.pt1:ATP1_r1:0:' + commands[type], '<m xmlns="http://oracle.com/richClient/comm"><k v="type"><s>action</s></k></m>'],
         ['oracle.adf.view.rich.PROCESS', 'pt1:ATP1_r1']
      ]);
      g_wasMainPage = true;
      html = AnyBalance.requestPost(baseurl + action, paramsMainPage, addHeaders({"Adf-Rich-Message": "true"}));
   }else{
      var rangeStart = getParam(html, null, null, /<input[^>]*name="([^"]*rangeStart)/i, null, html_entity_decode);
      
      var paramsModule = createParams([
         rangeStart ? [rangeStart, '0'] : null,
         ['org.apache.myfaces.trinidad.faces.FORM', 'f1'],
         ['javax.faces.ViewState', viewstate],
         ['oracle.adf.view.rich.RENDER', 'pt1:pt_r1'],
         ['event', 'pt1:pt_r1:0:' + commands[type]],
         ['event.pt1:pt_r1:0:' + commands[type], '<m xmlns="http://oracle.com/richClient/comm"><k v="type"><s>action</s></k></m>'],
         ['oracle.adf.view.rich.PROCESS', 'pt1:pt_r1']
      ]);

      html = AnyBalance.requestPost(baseurl + action, paramsModule, addHeaders({"Adf-Rich-Message": "true"}));
   }

   return getParam(html, null, null, /<fragment><!\[CDATA\[([\s\S]*?)\]\]>/); //Вычленяем html;
}

function getDetailes(html, event, baseurl, renderAndProcess){
   var action = getParam(html, null, null, /<form[^>]*name="f1"[^>]*action="\/(ALFAIBSR[^"]*)/i, null, html_entity_decode);
   if(!action)
       throw new AnyBalance.Error('Не удаётся найти форму ввода команды для получения деталей. Сайт изменен?');
   var viewstate = getParam(html, null, null, /<input[^>]*name="javax.faces.ViewState"[^>]*value="([^"]*)/i, null, html_entity_decode);
   if(!viewstate)
       throw new AnyBalance.Error('Не удаётся найти ViewState для получения деталей. Сайт изменен?');

      var rangeStart = getParam(html, null, null, /<input[^>]*name="([^"]*rangeStart)/i, null, html_entity_decode);
      if(!rangeStart)
          throw new AnyBalance.Error('Не удаётся найти rangeStart. Сайт изменен?');
      
   var paramsModule = createParams([
      [rangeStart, '0'],
      ['org.apache.myfaces.trinidad.faces.FORM', 'f1'],
      ['javax.faces.ViewState', viewstate],
      ['event', event],
      ['event.' + event, '<m xmlns="http://oracle.com/richClient/comm"><k v="type"><s>action</s></k></m>'],
      ['oracle.adf.view.rich.PPR_FORCED', 'true']
   ]);

   html = AnyBalance.requestPost(baseurl + action, paramsModule, addHeaders({"Adf-Rich-Message": "true"}));
   return getParam(html, null, null, /<fragment><!\[CDATA\[([\s\S]*?)\]\]>/); //Вычленяем html;
}

function processClick(){
    var prefs = AnyBalance.getPreferences();
    var type = prefs.type || 'card'; //По умолчанию карта
    if(prefs.cardnum && !/\d{4}/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите 4 последних цифры номера " + g_phrases.karty[type] + " или не вводите ничего, чтобы показать информацию по " + g_phrases.karte1[type]);

    var baseurl = "https://click.alfabank.ru/";
    
    var html = AnyBalance.requestGet(baseurl + 'ALFAIBSR/', g_headers);

    html = AnyBalance.requestPost(baseurl + 'adfform/security', {
        username: prefs.login,
        password: prefs.password.substr(0, 16),
    }, g_headers);

    html = AnyBalance.requestPost(baseurl + 'oam/server/auth_cred_submit', {
        username: prefs.login,
        password: prefs.password.substr(0, 16),
    }, g_headers);

    if(/<form[^>]*action="security"/.test(html)){
        //Мы остались на странице входа. какая-то ошибка
        var error = getParam(html, null, null, /(Неверный логин или пароль)/i);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось зайти в интернет-банк. Проверьте, что сайт доступен.");
    }

    var afr = getParam(html, null, null, /_afrLoop=(\d+)/i);
    if(!afr)
        throw new AnyBalance.Error('Не удаётся найти параметр для входа: _afrLoop. Обратитесь к автору провайдера.');

    html = AnyBalance.requestGet(baseurl + 'ALFAIBSR/?_afrLoop='+afr+'&_afrWindowMode=0&_afrWindowId=null', g_headers);

    var url = getParam(html, null, null, /<meta[^>]*\/(ALFAIBSR\/[^"']*)/i, null, html_entity_decode);
    
    html = AnyBalance.requestGet(baseurl + url, g_headers);

    var afr = getParam(html, null, null, /_afrLoop=(\d+)/i);
    if(!afr)
        throw new AnyBalance.Error('Не удаётся найти очередной параметр для входа: _afrLoop. Обратитесь к автору провайдера.');
    
    html = AnyBalance.requestGet(baseurl + url + '&_afrLoop='+afr+'&_afrWindowMode=0&_afrWindowId=null', g_headers);

    if(/login:otpPassword/i.test(html)){
        throw new AnyBalance.Error("Для работы провайдера необходимо отключить запрос одноразового пароля при входе в Альфа.Клик. Это безопасно - для совершения переводов средств пароль всё равно будет требоваться. Зайдите в Альфа.Клик через браузер и в меню \"Мой профиль\" снимите галочку \"Использовать одноразовый пароль при входе\".");
    }

    if(prefs.type == 'card')
        processCard(html, baseurl);
    else if(prefs.type == 'acc')
        processAccount(html, baseurl);
    else if(prefs.type == 'dep')
        processDep(html, baseurl);
    else if(prefs.type == 'crd' || prefs.type == 'credit')
        processCredit(html, baseurl);
    else 
        processCard(html, baseurl);
}

function processCard(html, baseurl){
    html = getMainPageOrModule(html, 'card', baseurl);
    
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите 4 последних цифры номера карты или не вводите ничего, чтобы показать информацию по первой карте");

    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<\\/tr>))*>\\d{4}\\s*[\\d\\*]{4}\\s*\\*{4}\\s*' + (prefs.cardnum ? prefs.cardnum : '\\d{4}') + '<[\\s\\S]*?<\\/tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.cardnum ? 'карту с последними цифрами ' + prefs.cardnum : 'ни одной карты'));
    
    var result = {success: true};
    getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'till', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'cardnum', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'cardtype', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'acctype', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    var id = getParam(tr, null, null, /<a[^>]*id="([^"]*)[^>]*>/i, null, html_entity_decode);
    if(!id){
        var cardnum = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        throw new AnyBalance.Error('Не удается найти ID карты ' + cardnum);
    }

    html = getDetailes(html, id, baseurl);
    //ФИО
    getParam(html, result, 'userName', /&#1060;&#1048;&#1054;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    //Статус
    getParam(html, result, 'status', /&#1057;&#1090;&#1072;&#1090;&#1091;&#1089;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    //Номер счета
    getParam(html, result, 'accnum', /&#1053;&#1086;&#1084;&#1077;&#1088;\s*&#1089;&#1095;&#1077;&#1090;&#1072;:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    //Баланс
    getParam(html, result, 'balance', /&#1041;&#1072;&#1083;&#1072;&#1085;&#1089;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    //Тип карты
    var type = getParam(html, null, null, /&#1058;&#1080;&#1087;\s*&#1082;&#1072;&#1088;&#1090;&#1099;:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    if(type && /кредитн/i.test(type) && AnyBalance.isAvailable('topay','paytill','minpay','penalty','late','overdraft','limit','debt','gracetill')){
        var accnum = getParam(html, null, null, /&#1053;&#1086;&#1084;&#1077;&#1088;\s*&#1089;&#1095;&#1077;&#1090;&#1072;:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);;
        if(!accnum)
            throw new AnyBalance.Error('Не удалось найти номер счета карты!');

	html = getMainPageOrModule(html, 'crd', baseurl);
        getCreditInfo(html, result, accnum, baseurl);
    }

    AnyBalance.setResult(result);
}

function getCreditInfo(html, result, accnum, baseurl, creditonly){
    
    //Сколько цифр осталось, чтобы дополнить до 20
    accnum = accnum || '';
    var accprefix = accnum.length;
    accprefix = 20 - accprefix;

    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<\\/tr>))*>[^<]*' + (accprefix ? '\\d{' + accprefix + '}' : '') + accnum + '<[\\s\\S]*?<\\/tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (accnum ? 'кредитный счет с последними цифрами ' + accnum : 'ни одного кредитного счета'));

    if(creditonly){
        getParam(tr, result, 'accnum', /(\d{20})/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(tr, result, 'acctype', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    }

    var id = getParam(tr, null, null, /<a[^>]*id="([^"]*)[^>]*>/i, null, html_entity_decode);
    if(!id){
        var accnum = getParam(tr, null, null, /(\d{20})/i, replaceTagsAndSpaces, html_entity_decode);
        throw new AnyBalance.Error('Не удается найти ID счета ' + accnum);
    }

    html = getDetailes(html, id, baseurl);

    //Сумма к оплате:
    getParam(html, result, 'topay', /&#1057;&#1091;&#1084;&#1084;&#1072;\s*&#1082;\s*&#1086;&#1087;&#1083;&#1072;&#1090;&#1077;:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    //Оплатить до|Дата платежа
    getParam(html, result, 'paytill', /(?:&#1054;&#1087;&#1083;&#1072;&#1090;&#1080;&#1090;&#1100;\s*&#1076;&#1086;|&#1044;&#1072;&#1090;&#1072;\s*&#1087;&#1083;&#1072;&#1090;&#1077;&#1078;&#1072;):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    //Минимальный платеж|Ежемесячный платеж
    getParam(html, result, 'minpay', /(?:&#1052;&#1080;&#1085;&#1080;&#1084;&#1072;&#1083;&#1100;&#1085;&#1099;&#1081;\s*&#1087;&#1083;&#1072;&#1090;&#1077;&#1078;|&#1045;&#1078;&#1077;&#1084;&#1077;&#1089;&#1103;&#1095;&#1085;&#1099;&#1081;\s*&#1087;&#1083;&#1072;&#1090;&#1077;&#1078;)[^:]*:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    //Штрафы
    getParam(html, result, 'penalty', /&#1064;&#1090;&#1088;&#1072;&#1092;&#1099;[^:]*:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    //Просроченная задолженность
    getParam(html, result, 'late', /&#1055;&#1088;&#1086;&#1089;&#1088;&#1086;&#1095;&#1077;&#1085;&#1085;&#1072;&#1103;\s*&#1079;&#1072;&#1076;&#1086;&#1083;&#1078;&#1077;&#1085;&#1085;&#1086;&#1089;&#1090;&#1100;:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    //Несанкционированный перерасход
    getParam(html, result, 'overdraft', /&#1053;&#1077;&#1089;&#1072;&#1085;&#1082;&#1094;&#1080;&#1086;&#1085;&#1080;&#1088;&#1086;&#1074;&#1072;&#1085;&#1085;&#1099;&#1081;\s*&#1087;&#1077;&#1088;&#1077;&#1088;&#1072;&#1089;&#1093;&#1086;&#1076;:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    //Общая задолженность|Остаток задолженности
    getParam(html, result, 'debt', /(?:&#1054;&#1073;&#1097;&#1072;&#1103;\s*&#1079;&#1072;&#1076;&#1086;&#1083;&#1078;&#1077;&#1085;&#1085;&#1086;&#1089;&#1090;&#1100;|&#1054;&#1089;&#1090;&#1072;&#1090;&#1086;&#1082;\s*&#1079;&#1072;&#1076;&#1086;&#1083;&#1078;&#1077;&#1085;&#1085;&#1086;&#1089;&#1090;&#1080;):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    //Дата о?кончания льготного периода
    getParam(html, result, 'gracetill', /&#1044;&#1072;&#1090;&#1072;\s*(?:&#1086;)?&#1082;&#1086;&#1085;&#1095;&#1072;&#1085;&#1080;&#1103;\s*&#1083;&#1100;&#1075;&#1086;&#1090;&#1085;&#1086;&#1075;&#1086;\s*&#1087;&#1077;&#1088;&#1080;&#1086;&#1076;&#1072;:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);

    if(creditonly){
        //Доступный лимит
        getParam(html, result, 'balance', /&#1044;&#1086;&#1089;&#1090;&#1091;&#1087;&#1085;&#1099;&#1081;\s*&#1083;&#1080;&#1084;&#1080;&#1090;:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'currency', /&#1044;&#1086;&#1089;&#1090;&#1091;&#1087;&#1085;&#1099;&#1081;\s*&#1083;&#1080;&#1084;&#1080;&#1090;:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
    }
}

function processCredit(html, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4,}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите не меньше 4 последних цифр номера кредитного счета или не вводите ничего, чтобы показать информацию по первому кредитному счету");

    html = getMainPageOrModule(html, 'crd', baseurl);

    var result = {success: true};

    getCreditInfo(html, result, prefs.cardnum, baseurl, true);

    AnyBalance.setResult(result);
}

function processAccount(html, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4,}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите не меньше 4 последних цифр номера счета или не вводите ничего, чтобы показать информацию по первому счету");

    html = getMainPageOrModule(html, 'acc', baseurl);
    
    //Сколько цифр осталось, чтобы дополнить до 20
    var accnum = prefs.cardnum || '';
    var accprefix = accnum.length;
    accprefix = 20 - accprefix;

    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<\\/tr>))*>' + (accprefix ? '\\d{' + accprefix + '}' : '') + accnum + '<[\\s\\S]*?<\\/tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (accnum ? 'счет с последними цифрами ' + accnum : 'ни одного счета'));

    var result = {success: true};

    getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'acctype', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

function processDep(html, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4,}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите не меньше 4 последних цифр номера счета депозита или не вводите ничего, чтобы показать информацию по первому депозиту");

    html = getMainPageOrModule(html, 'dep', baseurl);
    
    //Сколько цифр осталось, чтобы дополнить до 20
    var accnum = prefs.cardnum || '';
    var accprefix = accnum.length;
    accprefix = 20 - accprefix;

    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<\\/tr>))*>' + (accprefix ? '\\d{' + accprefix + '}' : '') + accnum + '<[\\s\\S]*?<\\/tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (accnum ? 'депозит с последними цифрами ' + accnum : 'ни одного депозита'));

    var result = {success: true};

    getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'acctype', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'till', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

