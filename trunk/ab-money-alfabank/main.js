/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
    AnyBalance.setOptions({cookiePolicy: 'rfc2109'});

    var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    /*if(prefs.usemobile)
        processMobile();
    else
        processClick();*/
	
	processClick();
}

var g_phrases = {
	karty: {
		card: 'карты',
		credit: 'кредитного счета'
	},
	karte1: {
		card: 'первой карте',
		credit: 'первому счету'
	}
}
var g_headers = [
	['Accept', '*/*'],
	['Accept-Charset', 'windows-1251,utf-8;q=0.7,*;q=0.3'],
	['Accept-Language', 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4'],
	['Connection', 'keep-alive'],
	['User-Agent', 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.89 Safari/537.1']
];

var g_currencyDependancy = ['currency', 'balance', 'topay', 'debt', 'minpay', 'penalty', 'late', 'overdraft', 'limit'];

function createParams(params, event) {
	var ret = {};
	for (var i = 0; i < params.length; ++i) {
		if (!params[i]) continue;
		ret[params[i][0].replace(/%EVENT%/g, event)] = params[i][1].replace(/%EVENT%/g, event);
	}
	return ret;
}

var g_wasMainPage = false;

function getMainPageOrModule(html, type, baseurl) {
	var commands = {
		card: 'MCD__cardlist',
		acc: 'MAC__accountlist',
		dep: 'MDP__depositlist',
		crd: 'MCR__credits'
	};
	var action = getParam(html, null, null, /<form[^>]*name="f1"[^>]*action="\/(ALFAIBSR[^"]*)/i, null, html_entity_decode);
	if (!action) throw new AnyBalance.Error('Не удаётся найти форму ввода команды. Сайт изменен?');
	var viewstate = getParam(html, null, null, /<input[^>]*name="javax.faces.ViewState"[^>]*value="([^"]*)/i, null, html_entity_decode);
	if (!viewstate) throw new AnyBalance.Error('Не удаётся найти ViewState. Сайт изменен?');
	if (!g_wasMainPage) {
		var paramsMainPage = createParams([
			['pt1:r1:0:dt1:rangeStart', '0'],
			['pt1:r4:0:table1:rangeStart', '0'],
			['pt1:r2:0:t1:rangeStart', '0'],
			['org.apache.myfaces.trinidad.faces.FORM', 'f1'],
			['javax.faces.ViewState', viewstate],
			['oracle.adf.view.rich.RENDER', 'pt1:left:ATP1_r1'],
			['event', 'pt1:left:ATP1_r1:0:' + commands[type]],
			['event.pt1:left:ATP1_r1:0:' + commands[type], '<m xmlns="http://oracle.com/richClient/comm"><k v="type"><s>action</s></k></m>'],
			['oracle.adf.view.rich.PROCESS', 'pt1:left:ATP1_r1']
		]);
		g_wasMainPage = true;
		html = AnyBalance.requestPost(baseurl + action, paramsMainPage, addHeaders({
			"Adf-Rich-Message": "true"
		}));
	} else {
		var rangeStart = getParam(html, null, null, /<input[^>]*name="([^"]*rangeStart)/i, null, html_entity_decode);
		var paramsModule = createParams([
			rangeStart ? [rangeStart, '0'] : null, ['org.apache.myfaces.trinidad.faces.FORM', 'f1'],
			['javax.faces.ViewState', viewstate],
			['oracle.adf.view.rich.RENDER', 'pt1:left:ATP1_r1'],
			['event', 'pt1:left:ATP1_r1:0:' + commands[type]],
			['event.pt1:left:ATP1_r1:0:' + commands[type], '<m xmlns="http://oracle.com/richClient/comm"><k v="type"><s>action</s></k></m>'],
			['oracle.adf.view.rich.PROCESS', 'pt1:left:ATP1_r1']
		]);
		html = AnyBalance.requestPost(baseurl + action, paramsModule, addHeaders({
			"Adf-Rich-Message": "true"
		}));
	}
	return getParam(html, null, null, /<fragment><!\[CDATA\[([\s\S]*?)\]\]>/); //Вычленяем html;
}

function getMainPageOrModule2(html, type, baseurl) {
	var commands = {
		card: 'pt1:menu:ATP2_r1:0:i1:1:cl2',
		acc: 'pt1:menu:ATP2_r1:0:i1:0:cl2',
		dep: 'pt1:menu:ATP2_r1:0:i1:3:cl2',
		crd: 'pt1:menu:ATP2_r1:0:i1:2:cl2'
	};
	
	var event = commands[type] ? commands[type] : type;
	
	return getNextPage(html, event, baseurl, [
		['oracle.adf.view.rich.RENDER', 'pt1:menu:ATP2_r1'],
		['oracle.adf.view.rich.DELTAS', '{pt1:menu:ATP2_r1:0:i1:3:p1={_shown=}}'],
		['event', '%EVENT%'],
		['event.%EVENT%', '<m xmlns="http://oracle.com/richClient/comm"><k v="type"><s>action</s></k></m>'],
		['oracle.adf.view.rich.PROCESS', 'pt1:menu:ATP2_r1']
	]);
}
function getNextPage(html, event, baseurl, extra_params) {
	var form = getParam(html, null, null, /<form[^>]*name="f1"[^>]*>([\s\S]*?)<\/form>/i);
	var action = getParam(html, null, null, /<form[^>]*name="f1"[^>]*action="\/(ALFAIBSR[^"]*)/i, null, html_entity_decode);
	if (!action) 
		throw new AnyBalance.Error('Не удаётся найти форму ввода команды. Сайт изменен?');
	
	var params = createFormParams(form, function(params, str, name, value) {
		if (/::input$/.test(name))
			return; //Ненужные поля
		return value;
	}, true);
	var paramsModule = createParams(joinArrays(params, extra_params), event);
	html = AnyBalance.requestPost(baseurl + action, paramsModule, addHeaders({"Adf-Rich-Message": "true"}));
	return getParam(html, null, null, /<fragment>\s*<!\[CDATA\[([\s\S]*?)\]\]>/); //Вычленяем html;
}
function getDetails(html, event, baseurl, renderAndProcess) {
	var action = getParam(html, null, null, /<form[^>]*name="f1"[^>]*action="\/(ALFAIBSR[^"]*)/i, null, html_entity_decode);
	if (!action) 
		throw new AnyBalance.Error('Не удаётся найти форму ввода команды для получения деталей. Сайт изменен?');
	var viewstate = getParam(html, null, null, /<input[^>]*name="javax.faces.ViewState"[^>]*value="([^"]*)/i, null, html_entity_decode);
	if (!viewstate)
		throw new AnyBalance.Error('Не удаётся найти ViewState для получения деталей. Сайт изменен?');
	var rangeStart = getParam(html, null, null, /<input[^>]*name="([^"]*rangeStart)/i, null, html_entity_decode);
	if (!rangeStart)
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
	
	html = getParam(html, null, null, /<fragment><!\[CDATA\[([\s\S]*?)\]\]>/); //Вычленяем html;
	//Проверим на Функционал временно недоступен
	var error = getParam(html, null, null, /(&#1060;&#1091;&#1085;&#1082;&#1094;&#1080;&#1086;&#1085;&#1072;&#1083; &#1074;&#1088;&#1077;&#1084;&#1077;&#1085;&#1085;&#1086; &#1085;&#1077;&#1076;&#1086;&#1089;&#1090;&#1091;&#1087;&#1077;&#1085;[^<]*)/,	null, html_entity_decode);
	if (error)
		throw new AnyBalance.Error(error);
	
	return html;
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
	
//    AnyBalance.trace("After first post");    

    html = AnyBalance.requestPost(baseurl + 'oam/server/auth_cred_submit', {
        username: prefs.login,
        password: prefs.password.substr(0, 16),
    }, g_headers);

    if(/<form[^>]*action="security"/.test(html)){
        //Мы остались на странице входа. какая-то ошибка
        var error = getParam(html, null, null, /<div[^>]+class="[^"]*\bred"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
        error = getParam(html, null, null, /(Неверный логин или пароль)/i);
        if(error)
            throw new AnyBalance.Error(error, null, true);
		
        throw new AnyBalance.Error("Не удалось зайти в интернет-банк. Сайт изменен?");
    }

    var afr = getParam(html, null, null, /"_afrLoop",\s*"(\d+)"/i);
    if(!afr)
        throw new AnyBalance.Error('Не удаётся найти параметр для входа: _afrLoop. Сайт изменен?');

    html = AnyBalance.requestGet(baseurl + 'ALFAIBSR/?_afrLoop='+afr+'&_afrWindowMode=0&_afrWindowId=null', g_headers);

    var url = getParam(html, null, null, /<meta[^>]*\/(ALFAIBSR\/[^"']*)/i, null, html_entity_decode);
    
    html = AnyBalance.requestGet(baseurl + url, g_headers);

    var afr = getParam(html, null, null, /"_afrLoop",\s*"(\d+)"/i);
    if(!afr)
        throw new AnyBalance.Error('Не удаётся найти очередной параметр для входа: _afrLoop. Сайт изменен?');
    
    html = AnyBalance.requestGet(baseurl + url + '&_afrLoop='+afr+'&_afrWindowMode=0&_afrWindowId=null', g_headers);

    if(/:otpPassword/i.test(html)){
        throw new AnyBalance.Error("Для работы провайдера необходимо отключить запрос одноразового пароля при входе в Альфа-Клик. Это безопасно - для совершения переводов средств пароль всё равно будет требоваться. Зайдите в Альфа-Клик через браузер и в меню \"Мой профиль\" снимите галочку \"Использовать одноразовый пароль при входе\".");
    }

    if(/faces\/main\/changePassword|faces\/routeChangePwd\/changePassword/i.test(html)){
        throw new AnyBalance.Error("Вам необходимо сменить старый пароль. Зайдите в Альфа-Клик через браузер, поменяйте пароль, затем введите новый пароль в настройки провайдера.", null, true);
    }

    if(/\(C2skin\)/.test(html)){  //Альфаклик 2.0
        AnyBalance.trace("Определен Альфа-Клик 2.0");
        if(prefs.type == 'card')
            processCard2(html, baseurl);
        else if(prefs.type == 'acc')
            processAccount2(html, baseurl);
        else if(prefs.type == 'dep')
            processDep2(html, baseurl);
        else if(prefs.type == 'crd' || prefs.type == 'credit')
            processCredit2(html, baseurl);
        else 
            processCard2(html, baseurl);
    }else{
        AnyBalance.trace("Определен Альфа-Клик 1.0");
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
    getParam(tr, result, g_currencyDependancy, /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
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

    html = getDetails(html, id, baseurl);
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
	
    if (type && /кредитн/i.test(type) && AnyBalance.isAvailable('topay', 'paytill', 'minpay', 'penalty', 'late', 'overdraft', 'limit', 'debt', 'gracetill')) {
    	var accnum = getParam(html, null, null, /&#1053;&#1086;&#1084;&#1077;&#1088;\s*&#1089;&#1095;&#1077;&#1090;&#1072;:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    	if (!accnum)
			throw new AnyBalance.Error('Не удалось найти номер счета карты!');
		
    	html = getMainPageOrModule(html, 'crd', baseurl);
    	getCreditInfo(html, result, accnum, baseurl);
    }

    AnyBalance.setResult(result);
}

function processCard2(html, baseurl){
    html = getMainPageOrModule2(html, 'card', baseurl);
    
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите 4 последних цифры номера карты или не вводите ничего, чтобы показать информацию по первой карте");

    var re = new RegExp('<a[^>]+class="c2_cardlist_Card[^>]*><span[^>]*>' + (prefs.cardnum ? prefs.cardnum : '\\d{4}'), 'i');

    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.cardnum ? 'карту с последними цифрами ' + prefs.cardnum : 'ни одной карты'));

    var event = getParam(tr, null, null, /<a[^>]+id="([^"]*)/i, null, html_entity_decode);
    var html = getNextPage(html, event, baseurl, [
    	['event', '%EVENT%'],
    	['event.%EVENT%', '<m xmlns="http://oracle.com/richClient/comm"><k v="type"><s>action</s></k></m>'],
    	['oracle.adf.view.rich.PPR_FORCED', 'true']
    ]);
    
    var result = {success: true};
    //Баланс счета
    getParam(html, result, 'balance', /&#1041;&#1072;&#1083;&#1072;&#1085;&#1089; &#1089;&#1095;&#1077;&#1090;&#1072;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, g_currencyDependancy, /&#1041;&#1072;&#1083;&#1072;&#1085;&#1089; &#1089;&#1095;&#1077;&#1090;&#1072;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
    //Срок действия
    getParam(html, result, 'till', /&#1057;&#1088;&#1086;&#1082; &#1076;&#1077;&#1081;&#1089;&#1090;&#1074;&#1080;&#1103;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    //Номер
    getParam(html, result, 'cardnum', /&#1053;&#1086;&#1084;&#1077;&#1088;<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /&#1053;&#1086;&#1084;&#1077;&#1088;<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    //Тип
    getParam(html, result, 'cardtype', /&#1058;&#1080;&#1087;<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    //Название счета
    getParam(html, result, 'acctype', /&#1053;&#1072;&#1079;&#1074;&#1072;&#1085;&#1080;&#1077; &#1089;&#1095;&#1077;&#1090;&#1072;<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    //Рады вас видеть
    getParam(html, result, 'userName', /&#1056;&#1072;&#1076;&#1099; &#1042;&#1072;&#1089; &#1074;&#1080;&#1076;&#1077;&#1090;&#1100;,([^<(]*)/i, replaceTagsAndSpaces, html_entity_decode);
    //Статус
    getParam(html, result, 'status', /&#1057;&#1090;&#1072;&#1090;&#1091;&#1089;<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    //Номер счета
    getParam(html, result, 'accnum', /&#1053;&#1086;&#1084;&#1077;&#1088; &#1089;&#1095;&#1077;&#1090;&#1072;<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    //Тип карты
    var type = getParam(html, null, null, /&#1058;&#1080;&#1087;<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    if (type && /кредитн/i.test(type) && AnyBalance.isAvailable('topay', 'paytill', 'minpay', 'penalty', 'late', 'overdraft', 'limit', 'debt', 'gracetill')) {
    	AnyBalance.trace('Карта кредитная, надо получить кредитную информацию...');
    	//Номер счета
    	var accnum = getParam(html, null, null, /&#1053;&#1086;&#1084;&#1077;&#1088; &#1089;&#1095;&#1077;&#1090;&#1072;<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    	try {
    		processCredit2(html, baseurl, accnum, result);
    	} catch (e) {
    		AnyBalance.trace('Не удалось получить кредитную информацию: ' + e.message);
    	}
    }

    AnyBalance.setResult(result);
}

function processAccount2(html, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4,}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите не меньше 4 последних цифр номера счета или не вводите ничего, чтобы показать информацию по первому счету");

    html = getMainPageOrModule2(html, 'acc', baseurl);
    
    //Сколько цифр осталось, чтобы дополнить до 20
    var accnum = prefs.cardnum || '';
    var accprefix = accnum.length;
    accprefix = 20 - accprefix;

    var re = new RegExp('<table[^>]+style="table-layout:\\s*fixed"[^>]*>(?:[\\s\\S](?!</?table))*?>' + (accprefix > 0 ? '\\d{' + accprefix + '}' : '') + accnum + '<[\\s\\S]*?</table>', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (accnum ? 'счет с последними цифрами ' + accnum : 'ни одного счета'));

    var result = {success: true};

    //Рады вас видеть
    getParam(html, result, 'userName', /&#1056;&#1072;&#1076;&#1099; &#1042;&#1072;&#1089; &#1074;&#1080;&#1076;&#1077;&#1090;&#1100;,([^<(]*)/i, replaceTagsAndSpaces, html_entity_decode);

    getParam(tr, result, g_currencyDependancy, /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'acctype', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

function processDep2(html, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4,}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите не меньше 4 последних цифр номера счета депозита или не вводите ничего, чтобы показать информацию по первому депозиту");

    html = getMainPageOrModule2(html, 'dep', baseurl);
    
    //Сколько цифр осталось, чтобы дополнить до 20
    var accnum = prefs.cardnum || '';
    var accprefix = accnum.length;
    accprefix = 20 - accprefix;

    var re = new RegExp('<table[^>]+table-layout:\\s*fixed[^>]*>(?:[\\s\\S](?!</?table))*?>' + (accprefix > 0 ? '\\d{' + accprefix + '}' : '') + accnum + '<[\\s\\S]*?</table>', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (accnum ? 'депозит с последними цифрами ' + accnum : 'ни одного депозита'));

    var result = {success: true};

    getParam(tr, result, g_currencyDependancy, /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'acctype', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    //Рады вас видеть
    getParam(html, result, 'userName', /&#1056;&#1072;&#1076;&#1099; &#1042;&#1072;&#1089; &#1074;&#1080;&#1076;&#1077;&#1090;&#1100;,([^<(]*)/i, replaceTagsAndSpaces, html_entity_decode);

    if (AnyBalance.isAvailable('till')) {
    	var event = getParam(tr, null, null, /<a[^>]+id="([^"]*)"[^>]*p_AFTextOnly/i);
    	if (!event) {
    		AnyBalance.trace('Не удаётся найти ссылку на расширенную информацию о депозите');
    	} else {
    		html = getNextPage(html, event, baseurl, [
    			['event', '%EVENT%'],
    			['event.%EVENT%', '<m xmlns="http://oracle.com/richClient/comm"><k v="type"><s>action</s></k></m>'],
    			['oracle.adf.view.rich.PPR_FORCED', 'true']
    		]);
    		getParam(html, result, 'till', /&#1054;&#1082;&#1086;&#1085;&#1095;&#1072;&#1085;&#1080;&#1077;<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    	}
    }

    AnyBalance.setResult(result);
}

function processCredit2(html, baseurl, _accnum, result){
    var prefs = AnyBalance.getPreferences();
    if(!_accnum && prefs.cardnum && !/^\d{4,}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите не меньше 4 последних цифр номера счета кредита или не вводите ничего, чтобы показать информацию по первому кредиту");

    html = getMainPageOrModule2(html, 'crd', baseurl);
	
    var events = sumParam(html, null, null, /<a[^>]+id="([^"]*)"[^>]*>&#1055;&#1086;&#1076;&#1088;&#1086;&#1073;&#1085;&#1072;&#1103; &#1080;&#1085;&#1092;&#1086;&#1088;&#1084;&#1072;&#1094;&#1080;&#1103;/ig);
    if(!events)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.cardnum ? 'кредит, чей номер оканчивается на ' + prefs.cardnum : 'ни одного кредита!'));
	
	AnyBalance.trace('Кредитов в системе: ' + events.length);
	
	var currentAccountNumber;
	
	for(var i = 0; i < events.length; i++) {
		AnyBalance.trace('Запрос данных по кредиту №' + (i+1));
		html = getNextPage(html, events[i], baseurl, [
			['event', '%EVENT%'],
			['event.%EVENT%', '<m xmlns="http://oracle.com/richClient/comm"><k v="type"><s>action</s></k></m>'],
			['oracle.adf.view.rich.PPR_FORCED', 'true']
		]);
		
		currentAccountNumber = getParam(html, null, null, /\d{20}/i);
		AnyBalance.trace('Нашли счет:' + currentAccountNumber);
		if(!prefs.cardnum) {
			AnyBalance.trace('В настройках не указан номер счета, будут отображены данные по первому счету...');
			break;
		}
	}
	
    result = result || {success: true};
	
    if(!_accnum){ //Если нас вызвали из карты, то это уже получено
        getParam(html, result, 'acctype', [/<a[^>]+p_AFTextOnly[^>]*>([\s\S]*?)<\/a>/i, /valign="baseline">([\s\S]*?)<\//i], replaceTagsAndSpaces, html_entity_decode);
        getParam(currentAccountNumber + '', result, 'accnum', null, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, '__tariff', [/<a[^>]+p_AFTextOnly[^>]*>([\s\S]*?)<\/a>/i, /valign="baseline">([\s\S]*?)<\//i], replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'userName', [/&#1056;&#1072;&#1076;&#1099; &#1042;&#1072;&#1089; &#1074;&#1080;&#1076;&#1077;&#1090;&#1100;,([^<(]*)/i, /human\.png">([\s\S]*?)</i], replaceTagsAndSpaces, html_entity_decode);
    }
	
    //Остаток задолженности
    if(!_accnum){ //Если нас вызвали из карты, то это уже получено
        getParam(html, result, g_currencyDependancy, [/&#1054;&#1089;&#1090;&#1072;&#1090;&#1086;&#1082; &#1079;&#1072;&#1076;&#1086;&#1083;&#1078;&#1077;&#1085;&#1085;&#1086;&#1089;&#1090;&#1080;<(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, 
			/&#1044;&#1083;&#1103; &#1087;&#1086;&#1083;&#1085;&#1086;&#1075;&#1086; &#1087;&#1086;&#1075;&#1072;&#1096;&#1077;&#1085;&#1080;&#1103;<(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i], replaceTagsAndSpaces, parseCurrency);
        getParam(html, result, 'balance', [/&#1054;&#1089;&#1090;&#1072;&#1090;&#1086;&#1082; &#1079;&#1072;&#1076;&#1086;&#1083;&#1078;&#1077;&#1085;&#1085;&#1086;&#1089;&#1090;&#1080;<(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, 
			/&#1044;&#1083;&#1103; &#1087;&#1086;&#1083;&#1085;&#1086;&#1075;&#1086; &#1087;&#1086;&#1075;&#1072;&#1096;&#1077;&#1085;&#1080;&#1103;<(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i], [replaceTagsAndSpaces, /([\s\S]*?)/i, '- $1'], parseBalance);
    }
	// Оплатить до
	getParam(html, result, 'paytill', /&#1057;&#1091;&#1084;&#1084;&#1072; &#1082; &#1086;&#1087;&#1083;&#1072;&#1090;&#1077;(?:[^>]*>){4}([\s\S]*?)<\//i, replaceTagsAndSpaces, function(str) { return parseDateWord (html_entity_decode(str))});
    //Задолженность|Остаток задолженности
    getParam(html, result, 'debt', /(?:&#1047;&#1072;&#1076;&#1086;&#1083;&#1078;&#1077;&#1085;&#1085;&#1086;&#1089;&#1090;&#1100;|&#1054;&#1089;&#1090;&#1072;&#1090;&#1086;&#1082; &#1079;&#1072;&#1076;&#1086;&#1083;&#1078;&#1077;&#1085;&#1085;&#1086;&#1089;&#1090;&#1080;)<(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    //Сумма к оплате
    getParam(html, result, 'topay', /ACCreditsLargeHeaderFont[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    //Минимальный платёж|Ежемесячный платеж
    getParam(html, result, 'minpay', [/(?:&#1052;&#1080;&#1085;&#1080;&#1084;&#1072;&#1083;&#1100;&#1085;&#1099;&#1081; &#1087;&#1083;&#1072;&#1090;&#1105;&#1078;|&#1045;&#1078;&#1077;&#1084;&#1077;&#1089;&#1103;&#1095;&#1085;&#1099;&#1081; &#1087;&#1083;&#1072;&#1090;&#1077;&#1078;)<(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i,
		/&#1045;&#1078;&#1077;&#1084;&#1077;&#1089;&#1103;&#1095;&#1085;&#1099;&#1081; &#1087;&#1083;&#1072;&#1090;&#1105;&#1078;[^>]*>([\s\S]*?)<\//i], replaceTagsAndSpaces, parseBalance);
    //Основной долг
//    getParam(html, result, 'debt', /&#1054;&#1089;&#1085;&#1086;&#1074;&#1085;&#1086;&#1081; &#1076;&#1086;&#1083;&#1075;<(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    //Установленный лимит|Начальная сумма кредита
    getParam(html, result, 'limit', /(?:&#1059;&#1089;&#1090;&#1072;&#1085;&#1086;&#1074;&#1083;&#1077;&#1085;&#1085;&#1099;&#1081; &#1083;&#1080;&#1084;&#1080;&#1090;|&#1053;&#1072;&#1095;&#1072;&#1083;&#1100;&#1085;&#1072;&#1103; &#1089;&#1091;&#1084;&#1084;&#1072; &#1082;&#1088;&#1077;&#1076;&#1080;&#1090;&#1072;)<(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    //Штрафы и неустойки
    getParam(html, result, 'penalty', /&#1064;&#1090;&#1088;&#1072;&#1092;&#1099;(?: &#1080; &#1085;&#1077;&#1091;&#1089;&#1090;&#1086;&#1081;&#1082;&#1080;)?<(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    //Просроченная задолженность
    getParam(html, result, 'late', /&#1055;&#1088;&#1086;&#1089;&#1088;&#1086;&#1095;&#1077;&#1085;&#1085;&#1072;&#1103; &#1079;&#1072;&#1076;&#1086;&#1083;&#1078;&#1077;&#1085;&#1085;&#1086;&#1089;&#1090;&#1100;<(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    //Несанкционированный перерасход
    getParam(html, result, 'overdraft', /&#1053;&#1077;&#1089;&#1072;&#1085;&#1082;&#1094;&#1080;&#1086;&#1085;&#1080;&#1088;&#1086;&#1074;&#1072;&#1085;&#1085;&#1099;&#1081; &#1087;&#1077;&#1088;&#1077;&#1088;&#1072;&#1089;&#1093;&#1086;&#1076;<(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    // Льготный период
    getParam(html, result, 'gracetill', /&#1044;&#1072;&#1090;&#1072; &#1086;&#1082;&#1086;&#1085;&#1095;&#1072;&#1085;&#1080;&#1103; &#1083;&#1100;&#1075;&#1086;&#1090;&#1085;&#1086;&#1075;&#1086; &#1087;&#1077;&#1088;&#1080;&#1086;&#1076;&#1072;[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);	
	
    AnyBalance.setResult(result);
}

function getCreditInfo(html, result, accnum, baseurl, creditonly){
    //Сколько цифр осталось, чтобы дополнить до 20
    accnum = accnum || '';
    var accprefix = accnum.length;
    accprefix = 20 - accprefix;

    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<\\/tr>))*>[^<]*' + (accprefix > 0 ? '\\d{' + accprefix + '}' : '') + accnum + '<[\\s\\S]*?<\\/tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (accnum ? 'кредитный счет с последними цифрами ' + accnum : 'ни одного кредитного счета!'));

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

    html = getDetails(html, id, baseurl);

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
    //Установленный лимит|Начальная сумма кредита
    getParam(html, result, 'limit', /(?:&#1059;&#1089;&#1090;&#1072;&#1085;&#1086;&#1074;&#1083;&#1077;&#1085;&#1085;&#1099;&#1081; (?:&#1082;&#1088;&#1077;&#1076;&#1080;&#1090;&#1085;&#1099;&#1081; )?&#1083;&#1080;&#1084;&#1080;&#1090;|&#1053;&#1072;&#1095;&#1072;&#1083;&#1100;&#1085;&#1072;&#1103; &#1089;&#1091;&#1084;&#1084;&#1072; &#1082;&#1088;&#1077;&#1076;&#1080;&#1090;&#1072;)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    if(creditonly) {
        //Доступный лимит
        getParam(html, result, 'balance', /&#1044;&#1086;&#1089;&#1090;&#1091;&#1087;&#1085;&#1099;&#1081;\s*&#1083;&#1080;&#1084;&#1080;&#1090;:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, g_currencyDependancy, /&#1044;&#1086;&#1089;&#1090;&#1091;&#1087;&#1085;&#1099;&#1081;\s*&#1083;&#1080;&#1084;&#1080;&#1090;:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
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

    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<\\/tr>))*>' + (accprefix > 0 ? '\\d{' + accprefix + '}' : '') + accnum + '<[\\s\\S]*?<\\/tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (accnum ? 'счет с последними цифрами ' + accnum : 'ни одного счета'));

    var result = {success: true};

    getParam(tr, result, g_currencyDependancy, /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
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

    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<\\/tr>))*>' + (accprefix > 0 ? '\\d{' + accprefix + '}' : '') + accnum + '<[\\s\\S]*?<\\/tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (accnum ? 'депозит с последними цифрами ' + accnum : 'ни одного депозита'));

    var result = {success: true};

    getParam(tr, result, g_currencyDependancy, /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'acctype', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'till', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
