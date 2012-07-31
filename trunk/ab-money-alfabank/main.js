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
    var _text = text.replace(/\s+/, '');
    var val = getParam(_text, null, null, /(-?\d[\d\.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseCurrency(text){
    text = text.replace(/\s+/, '');
    var val = getParam(text, null, null, /-?\d[\d\.,]*&nbsp;(\S*)/);
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

function processClick(){
    var prefs = AnyBalance.getPreferences();
    var type = prefs.type || 'card'; //По умолчанию карта
    if(prefs.cardnum && !/\d{4}/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите 4 последних цифры номера " + g_phrases.karty[type] + " или не вводите ничего, чтобы показать информацию по " + g_phrases.karte1[type]);

    var baseurl = "https://click.alfabank.ru/ALFAIBSR/";
    
    var html = AnyBalance.requestGet(baseurl);
    var sessionid = getParam(html, null, null, /SRC="[^"]*?jsessionid=([^"]*)"/i);
//    var nexturl = getParam(html, null, null, /SRC="(index2.jsp;[^"]*)"/i);
//    if(!nexturl)
//         throw new AnyBalance.Error('Не удаётся найти адрес формы входа');

//    html = AnyBalance.requestGet(baseurl + sessionurl);
//    html = AnyBalance.requestGet(baseurl + nexturl);

    html = AnyBalance.requestPost(baseurl + 'ControllerServlet;jsessionid=' + sessionid, {command: 'auth_loginByPasswordPage'});
    var nexturl = getParam(html, null, null, /action='([^']*)'/i);
    var OTOkey = getParam(html, null, null, /['"]OTOkey['"]\s*value=["']([^'"]*)["']/i);
    var dt = new Date();

    html = AnyBalance.requestPost(baseurl + nexturl, {
        command: 'auth_loginByPassword',
        username: prefs.login,
        password: prefs.password.substr(0, 16),
        OTOKey: OTOkey,
        CurrentTime: dt.getHours()
    });

    var sms = getParam(html, null, null, /(id="loginOTP")/i);
    if(sms)
        throw new AnyBalance.Error("Для работы провайдера необходимо отключить запрос одноразового пароля при входе в Альфа.Клик. Это безопасно - для совершения переводов средств пароль всё равно будет требоваться. Зайдите в Альфа.Клик через браузер и в меню Настройки - Мой профиль снимите галочку \"Использовать одноразовый пароль при входе\".");

    var error = getParam(html, null, null, /id="errors"[^>]*>([\s\S]*?)<\/DIV>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    nexturl = getParam(html, null, null, /action="([^"]*)"/i);
    if(!nexturl)
        throw new AnyBalance.Error('Не удаётся найти адрес главной внутренней страницы');

    if(type == 'credit')
    	getCreditInfoFull(baseurl + nexturl);
    else
    	getCardsInfo(baseurl + nexturl);
}

function processMobile(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://m.alfabank.ru/ALFAPDA/ControllerServlet";
    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestGet(baseurl);
    var OTOkey = getParam(html, null, null, /['"]OTOkey['"]\s*value=["']([^'"]*)["']/i);
    var loginname = getParam(html, null, null, /['"]field_login['"]\s*name=["']([^'"]*)["']/i);
    var passname = getParam(html, null, null, /['"]field_passwd['"]\s*name=["']([^'"]*)["']/i);

    var params = {
        command:'auth_loginByPassword',
        OTOKey:OTOkey
    };

    params[loginname] = prefs.login;
    params[passname] = prefs.password.substr(0, 16);

    html = AnyBalance.requestPost(baseurl, params);

    var error = getParam(html, null, null, /id="errors"[^>]*>([\s\S]*?)<\/DIV>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error == 'Логин заблокирован')
        throw new AnyBalance.Error('Необходимо разрешить доступ к мобильному альфа.клику (m.alfabank.ru) в настройках основного альфа.клика (click.alfabank.ru). Только, к сожалению, Альфабанк убрал эту настройку. Воспользуйтесь получением информации через основной Альфа.Клик.');
    if(error)
        throw new AnyBalance.Error(error);

    getCardsInfo(baseurl);
    
}

function getCreditInfoFull(baseurl){
    var prefs = AnyBalance.getPreferences();
    var accnum = prefs.cardnum ? '\\d{16}' + prefs.cardnum : '\\d{20}';

    var result = {success: true};
    
    getCreditInfo(baseurl, result, accnum, true);

    AnyBalance.setResult(result);
}

function getCardsInfo(baseurl){
    var prefs = AnyBalance.getPreferences();
    var html = AnyBalance.requestPost(baseurl, {command:'card_list'});
    var cardnum = prefs.cardnum || '\\d{4}';

    var matches = html.match(new RegExp("'card_detail',\\s*'([^']*)'\\s*,\\s*'([^']*)'\\s*,'([^']*)'\\s*,'([^']*)'\\s*,'([^']*)'[^>]*>([^<]*" + cardnum + ")(?:\\s|&nbsp;)*<", 'i'));
    if(!matches){
        if(prefs.cardnum)
            throw new AnyBalance.Error('Не удалось найти карту с последними цифрами ' + prefs.cardnum);
        else
            throw new AnyBalance.Error('Не удалось найти ни одной карты!');
    }
    
    html = AnyBalance.requestPost(baseurl, {command:'card_detail', custom1: matches[1], custom2: matches[2], custom3: matches[3], custom4: matches[4], custom5: matches[5]});

    var result = {success: true};
    
    getParam(html, result, 'cardnum', /Номер карты:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Номер карты:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'userName', /ФИО держателя карты:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'till', /Срок действия карты:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'accnum', /Номер счета:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Баланс счета:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'currency', /Баланс счета:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
   
    var type = getParam(html, null, null, /Тип карты:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    if(type && /кредитная/i.test(type) && AnyBalance.isAvailable('topay','paytill','minpay','penalty','late','overdraft','limit','debt','gracetill')){
        var accnum = getParam(html, null, null, /Номер счета:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        if(!accnum)
            throw new AnyBalance.Error('Не удалось найти номер счета карты!');

        getCreditInfo(baseurl, result, accnum);
    }

    AnyBalance.setResult(result);
}

function getCreditInfo(baseurl, result, accnum, creditonly){
    var html = AnyBalance.requestPost(baseurl, {command:'balances_listMyLoans'});

    var matches = html.match(new RegExp("'creditDetail_accountDetail',\\s*'([^']*)'\\s*,\\s*'([^']*)'\\s*,'([^']*)'\\s*,'([^']*)'\\s*,'([^']*)'[^<]*(" + accnum + ')[^\d]', 'i'));
    if(!matches)
        if(!creditonly){
            throw new AnyBalance.Error('Невозможно найти информацию по кредитному счету ' + accnum + '!');
        }else{
            throw new AnyBalance.Error('Невозможно найти информацию ' + (/\d{4}/.test(accnum) ? 'по счету с последними цифрами ' + accnum.substr(-4) : 'ни по одному кредитному счету') + '!');
        }

    if(creditonly){
        getParam(matches[6], result, 'accnum', /(.*)/, replaceTagsAndSpaces, html_entity_decode);
        getParam(matches[6], result, '__tariff', /(.*)/, replaceTagsAndSpaces, html_entity_decode);
    }

    html = AnyBalance.requestPost(baseurl, {command:'creditDetail_accountDetail', custom1: matches[1], custom2: matches[2], custom3: matches[3], custom4: matches[4], custom5: matches[5]});
    
    getParam(html, result, 'topay', /Сумма к оплате:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'paytill', /(?:Оплатить до|Дата платежа):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'minpay', /(?:Минимальный платеж|Ежемесячный платеж)[^:]*:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'penalty', /Штрафы[^:]*:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'late', /Просроченная задолженность:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'overdraft', /Несанкционированный перерасход:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'limit', /(?:Установленный кредитный лимит|Начальная сумма кредита):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'debt', /(?:Общая задолженность|Остаток задолженности):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'gracetill', /Дата окончания льготного периода:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);

    if(creditonly){
        getParam(html, result, 'balance', /Доступный лимит:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

