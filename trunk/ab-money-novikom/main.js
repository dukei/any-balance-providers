/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function sleep(delay) {
	AnyBalance.trace('Sleeping ' + delay + ' ms');
	if (AnyBalance.getLevel() < 6) {
		var startTime = new Date();
		var endTime = null;
		do {
			endTime = new Date();
		} while (endTime.getTime() - startTime.getTime() < delay);
	} else {
		AnyBalance.trace('Calling hw sleep');
		AnyBalance.sleep(delay);
	}
}

function encryptPass(pass, map) {
	if (map) {
		var ch = '',
			i = 0,
			k = 0,
			TempPass = '',
			PassTemplate = map.split(','),
			Pass = '';
		TempPass = pass;
		while (TempPass != '') {
			ch = TempPass.substr(0, 1);
			k = ch.charCodeAt(0);
			if (k > 0xFF) k -= 0x350;
			if (k == 7622) k = 185;
			TempPass = TempPass.length > 1 ? TempPass.substr(1, TempPass.length) : '';
			if (Pass != '') Pass = Pass + ';';
			Pass = Pass + PassTemplate[k];
		}
		return Pass;
	} else {
		return pass;
	}
}

var g_headers = {
	'Accept-Language': 'ru, en',
	BSSHTTPRequest: 1,
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://retail.novikom.ru/'; //   v2/cgi/bsi.dll?
    
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	// Откроем первую страницу, чтобы получить ссылку
	var html = AnyBalance.requestGet(baseurl);
	
	var href = getParam(html, null, null, /(v\d+\/cgi\/bsi\.dll\?)/i);
	if(!href) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти ссылку на вход, сайт изменен?');
	}
	baseurl += href;
	
    var html = AnyBalance.requestGet(baseurl + 'T=RT_2Auth.BF');
    var mapId = getParam(html, null, null, /<input[^>]*name="MapID"[^>]*value="([^"]*)"/i);
    var map = getParam(html, null, null, /var\s+PassTemplate\s*=\s*new\s+Array\s*\(([^\)]*)/i);
    var pass = encryptPass(prefs.password, map);
	
    html = AnyBalance.requestPost(baseurl, {
        tic: 0,
        T:'RT_2Auth.CL',
        A:prefs.login,
        B:pass,
        L:'russian',
        C:'',
        IdCaptcha:'',
        IMode:'',
        sTypeInterface:'default',
        MapID:mapId || ''
    }, g_headers);
	
    var error = getParam(html, null, null, /<BSS_ERROR>\d*\|?([\s\S]*?)<\/BSS_ERROR>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);
	
    var jsonInfo = getParam(html, null, null, /ClientInfo=(\{[\s\S]*?\})\s*(?:<\/div>|$)/i);
    if(!jsonInfo)
        throw new AnyBalance.Error("Не удалось найти информацию о сессии в ответе банка.");
	
    jsonInfo = JSON.parse(jsonInfo);
    var html = AnyBalance.requestPost(baseurl, {
        SID:jsonInfo.SID,
        tic:1,
        T:'rt_0clientupdaterest.doheavyupd'
    }, g_headers);
	
    var i = 0;
    do {
    	AnyBalance.trace('Ожидание обновления данных: ' + (i + 1));
    	html = AnyBalance.requestPost(baseurl, {
    		SID: jsonInfo.SID,
    		tic: 1,
    		T: 'rt_0clientupdaterest.CheckForAcyncProcess'
    	}, addHeaders({
    		Referer: baseurl + 'T=RT_2Auth.BF'
    	}));
    	var opres = getParam(html, null, null, /^\s*(?:<BSS_ERROR>([\s\S]*?)<\/BSS_ERROR>)?([\s\S]*>)?\d+\s*$/i, replaceTagsAndSpaces, html_entity_decode);
    	if (opres) {
    		AnyBalance.trace('Обновление данных закончено. ' + opres);
    		break; //Всё готово, надо получать баланс
    	}
    	if (++i > 10) { //На всякий случай не делаем больше 10 попыток
    		AnyBalance.trace('Не удалось за 10 попыток обновить баланс, получаем старое значение...');
    		break;
    	}
    	sleep(3000);
    } while (true);
	
    if(prefs.type == 'acc')
        fetchAccount(jsonInfo, baseurl);
    else
        fetchCard(jsonInfo, baseurl); //По умолчанию карты будем получать
}

function fetchCard(jsonInfo, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите 4 последних цифры номера карты или не вводите ничего, чтобы показать информацию по первой карте");
	
	var html = AnyBalance.requestPost(baseurl, {
        SID:jsonInfo.SID,
        tic:1,
        T:'RT_2IC.form',
		nvgt:1,
		XACTION:'',
		SCHEMENAME:'COMMPAGE'
    }, g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'fio', /<H1>([^<,]+)(?:[^>]*>){2}Добро пожаловать в систему/i);
	
	// <TR[^>]*onclick="ToSTM(?:[^>]*>){2}\d{4}[\d\s*]{8,}7133(?:[^>]*>){7,8}
	var cardnum = prefs.cardnum ? prefs.cardnum : '\\d{4}';
	
	var re = new RegExp('<TR[^>]*onclick="ToSTM(?:[^>]*>){2}\\d{4}[\\d\\s*]{8,}' + cardnum + '(?:[^>]*>){7,8}', 'i');
	var card = getParam(html, null, null, re);
	if(!card)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.cardnum ? 'карту с последними цифрами ' + prefs.cardnum : 'ни одной карты!'));
	
	getParam(card, result, 'balance', /(?:[\s\S]*?<TD[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(card, result, ['currency', 'balance'], /(?:[\s\S]*?<TD[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces);
	getParam(card, result, '__tariff', /(?:[\s\S]*?<TD[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces);
	getParam(result.__tariff, result, 'cardnum');
	getParam(card, result, 'type', /(?:[\s\S]*?<TD[^>]*>){4}([^<]+)/i, replaceTagsAndSpaces);
	
    AnyBalance.setResult(result);
}

function fetchAccount(jsonInfo, baseurl){
	throw new AnyBalance.Error("Получение данных по счетам пока не поддерживается, свяжитесь с разработчиками.");
}