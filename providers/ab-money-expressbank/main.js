/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт/счетов/депозитов банка Юниаструм

Сайт оператора: http://www.express-bank.ru/
Личный кабинет: https://online.express-bank.ru
*/

var g_headers = {
    Expect: '100-Continue',
	Connection: 'Keep-Alive',
	'User-Agent': 'Apache-HttpClient/UNAVAILABLE (java 1.4)'
}

var g_baseurl = "https://online.express-bank.ru/v1/cgi/bsi.dll?";

function makeRequest(params, strParams){
    var baseParams = {
    	Console:	'android',
		L:	'RUSSIAN',
		TIC:	'1',
		ChannelType:	'HTTP',
		MINTime:	'163',
		MAXTime:	'380',
		AVGTime:	'271',
		MINSpeed:	'118',
		MAXSpeed:	'472',
		AVGSpeed:	'240',
		MobDevice:	'htc HTC Desire 600',
	};
	for(var param in params){
	    baseParams[param] = params[param];
	}
	if(strParams){
		var aParams = strParams.split(/;/g);
		for(var i=0; i<aParams.length; ++i){
			var param = aParams[i].split('=');
			baseParams[param[0]] = param[1];
		}
	}
    var html = AnyBalance.requestPost(g_baseurl, baseParams, g_headers);
    var error = getParam(html, null, null, /<DIV[^>]+ID="RTSError"[^>]*>([\s\S]*?)<\/DIV>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
    	throw new AnyBalance.Error(error);
    return html;
}

function main(){
    var prefs = AnyBalance.getPreferences();

    checkEmpty(prefs.login, 'Введите логин в интернет-банк!');
    checkEmpty(prefs.password, 'Введите пароль в интернет-банк!');

    AnyBalance.setOptions({DEFAULT_CHARSET: 'utf-8'});

    var mainMenu = makeRequest({
		b:	prefs.password,
		a:	prefs.login,
		T:	'RT_2Auth.CL'
    });

    var sid = getParam(mainMenu, null, null, /<form[^>]+sid="([^"]*)/i, replaceHtmlEntities);
    if(!sid){
    	var error = getParam(mainMenu, null, null, /<label[^>]+caption="([^"]*)/i, replaceHtmlEntities);
    	if(error)
    		throw new AnyBalance.Error(error, null, /имени пользователя или пароля/i.test(error));
    	AnyBalance.trace(mainMenu);
        throw new AnyBalance.Error("Не удалось найти информацию о сессии в ответе банка.");
    }

    html = makeRequest({
		SID:	sid,
		T:	'rt_0clientupdaterest.doheavyupd'
    });
    
    AnyBalance.setOptions({FORCE_CHARSET: 'utf-8'});

    for(var i=0; i<10; ++i){
    	AnyBalance.trace('Trying to update: ' + i);
    	AnyBalance.sleep(4000);

        html = makeRequest({
			SID:	sid,
			T:	'rt_0clientupdaterest.CheckForAcyncProcess'
        });
    	
    	var res = AnyBalance.getLastResponseHeader('ERRCODE');
    	if(res == 0){
    		AnyBalance.trace('The update process finished: ' + getParam(html, null, null, /<BSS_ERROR>([\s\S]*?)<\/BSS_ERROR>/i, replaceTagsAndSpaces, html_entity_decode));
    		break;
    	}
    }

    AnyBalance.setOptions({FORCE_CHARSET: null});

    if(i >= 10)
    	AnyBalance.trace('Too many tries to get update done. Skipping it...');

    if(prefs.type == 'card')
        fetchCard(sid, mainMenu);
    else if(prefs.type == 'acc')
        fetchAccount(sid, mainMenu);
    else
        fetchCard(sid, mainMenu); //По умолчанию карты будем получать
}

function fetchCard(sid, html){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите 4 последних цифры номера карты или не вводите ничего, чтобы показать информацию по первой карте");

    var cardsParams = getParam(html, null, null, /<menuitem[^>]+action="url\(([^)]*)\)[^>]+icon="cards"/i);
    
    html = makeRequest({SID: sid}, cardsParams);
    var card = getParam(html, null, null, new RegExp('<card[^>]+num="[\\dx]{12}' + (prefs.cardnum || '\\d{4}') + '"[^>]*'));

    if(!card)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.cardnum ? 'карту с последними цифрами ' + prefs.cardnum : 'ни одной карты'));
	
    var result = {success: true};
    
    getParam(card, result, '__tariff', /\bnum="([^"]*)/, replaceHtmlEntities);
	getParam(result.__tariff, result, 'num');

    getParam(card, result, 'type', /\btype="([^"]*)/, replaceHtmlEntities);
    getParam(card, result, 'balance', /\brest="([^"]*)/, replaceHtmlEntities, parseBalance);
    getParam(card, result, ['currency', 'balance', 'limit'], /\brest="([^"]*)/, replaceHtmlEntities, parseCurrency);
    getParam(card, result, 'holder', /\bholder="([^"]*)/, replaceHtmlEntities);
    getParam(card, result, 'status', /\bstatus="([^"]*)/, replaceHtmlEntities);
    getParam(card, result, 'till', /\bdate="([^"]*)/, replaceHtmlEntities, parseDate);
    getParam(card, result, 'limit', /\blimit="([^"]*)/, replaceHtmlEntities, parseBalance);

    getParam(card, result, 'fio', /\bname="([^"]*)/, replaceHtmlEntities);
	
    AnyBalance.setResult(result);
}

function fetchAccount(sid, html){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4,}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите начало номера счета или не вводите ничего, чтобы показать информацию по первому счету");
	
    var params = getParam(html, null, null, /<menuitem[^>]+action="url\(([^)]*)\)[^>]+icon="accounts"/i);

    html = makeRequest({SID: sid}, params);
	var row = getParam(html, null, null, new RegExp('<accitem[^>]+num="\\d{0,16}' + (prefs.cardnum || '\\d{4}') + '"[^>]*'));

	if(!row)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.cardnum ? 'счет с первыми цифрами ' + prefs.cardnum : 'ни одного счета'));

    var result = {success: true};
	
    getParam(row, result, '__tariff', /\bnum="([^"]*)/, replaceHtmlEntities);
	getParam(result.__tariff, result, 'num');

    getParam(row, result, 'type', /\btype="([^"]*)/, replaceHtmlEntities);
    getParam(row, result, 'balance', /\brest="([^"]*)/, replaceHtmlEntities, parseBalance);
    getParam(row, result, ['currency', 'balance'], /\brest="([^"]*)/, replaceHtmlEntities, parseCurrency);
	
    AnyBalance.setResult(result);
}
