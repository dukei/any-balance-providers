/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'*/*',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
	'X-MicrosoftAjax':'Delta=true',
	'X-Requested-With':'XMLHttpRequest'
};

var g_baseurl = "https://retail.payment.ru";

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function getEventValidation(html){
    return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/);
}

function getViewStateGenerator(html){
    return getParam(html, null, null, /name="__VIEWSTATEGENERATOR".*?value="([^"]*)/);
}

// function getViewState1(html){
    // return getParam(html, null, null, /__VIEWSTATE\|([^\|]*)/);
// }

// function getEventValidation1(html){
    // return getParam(html, null, null, /__EVENTVALIDATION\|([^\|]*)/);
// }

// function checkForErrors(html) {
    // var error = getParam(html, null, null, /<div[^>]*class="errorMessage"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	// if(error)
		// throw new AnyBalance.Error(error);
	// if(!/pageRedirect/i.test(html))
		// throw new AnyBalance.Error("Не удаётся войти в интернет банк (внутренняя ошибка сайта)");
	// if(/KeyAuth/i.test(html))
		// throw new AnyBalance.Error("Для входа в интернет-банк требуются одноразовые пароли. Зайдите в интернет-банк с компьютера и отключите в Настройках требование одноразовых паролей при входе. Это безопасно, для операций по переводу денег пароли всё равно будут требоваться.");
// }

function requestAndCheckForErrors(method, url, params, headers, folowRedirect) {
	
	if(/POST/.test(method)) {
		var html = AnyBalance.requestPost(url, params, headers);
	} else {
		var html = AnyBalance.requestGet(url, headers);
	}
	
	if(folowRedirect && !/pageRedirect/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error("Не удаётся войти в интернет банк (внутренняя ошибка сайта)");
	}
	
	if(/KeyAuth/i.test(html))
		throw new AnyBalance.Error("Для входа в интернет-банк требуются одноразовые пароли. Зайдите в интернет-банк с компьютера и отключите в Настройках требование одноразовых паролей при входе. Это безопасно, для операций по переводу денег пароли всё равно будут требоваться.");
	if(/UpdateContactInfo.aspx/i.test(html))
		throw new AnyBalance.Error("Для входа в интернет-банк требуются обновить контактную информацию. Зайдите в интернет-банк с компьютера и следуйте инструкциям.");
	
	if(folowRedirect) {
		var authHref = getParam(html, null, null, /pageRedirect\|\|([^\|]*)/i, replaceTagsAndSpaces, decodeURIComponent);
		
		AnyBalance.trace('Нашли ссылку ' + authHref);
		//authHref = decodeURIComponent(authHref);
		//AnyBalance.trace('Привели ссылку к нормальному виду ' + authHref);
		// Они добавили еще один шаг авторизации, эта ссылка ставит кучу кук и возвращает 302, без нее не работает
		html = AnyBalance.requestGet(g_baseurl + authHref, g_headers);
	}
	
	var error = getParam(html, null, null, /<div[^>]*class="errorMessage"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	if(error)
		throw new AnyBalance.Error(error);
	
	return html;
}

function main(){
    var prefs = AnyBalance.getPreferences();
	
    AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, "Пожалуйста, укажите логин для входа в интернет-банк Промсвязбанка!");
	checkEmpty(prefs.password, "Пожалуйста, укажите пароль для входа в интернет-банк Промсвязбанка!");
	
    var html = AnyBalance.requestGet(g_baseurl + '/n/Default.aspx', g_headers);
    var eventvalidation = getEventValidation(html);
    var viewstate = getViewState(html);
    var viewStateGenerator = getViewStateGenerator(html);

    AnyBalance.setCookie('retail.payment.ru', '__dp_rsa', 'version%3D3%2E4%2E1%2E0%5F1%26pm%5Ffpua%3Dmozilla%2F5%2E0%20%28windows%20nt%206%2E1%3B%20wow64%29%20applewebkit%2F537%2E36%20%28khtml%2C%20like%20gecko%29%20chrome%2F42%2E0%2E2311%2E90%20safari%2F537%2E36%7C5%2E0%20%28Windows%20NT%206%2E1%3B%20WOW64%29%20AppleWebKit%2F537%2E36%20%28KHTML%2C%20like%20Gecko%29%20Chrome%2F42%2E0%2E2311%2E90%20Safari%2F537%2E36%7CWin32%26pm%5Ffpsc%3D24%7C1440%7C900%7C900%26pm%5Ffpsw%3D%26pm%5Ffptz%3D3%26pm%5Ffpln%3Dlang%3Dru%7Csyslang%3D%7Cuserlang%3D%26pm%5Ffpjv%3D1%26pm%5Ffpco%3D1%26pm%5Ffpasw%3Dwidevinecdmadapter%7Cmhjfbmdgcfjbbpaeojofohoefgiehjai%7Cpepflashplayer%7Cinternal%2Dremoting%2Dviewer%7Cinternal%2Dnacl%2Dplugin%7Cinternal%2Dpdf%2Dviewer%26pm%5Ffpan%3DNetscape%26pm%5Ffpacn%3DMozilla%26pm%5Ffpol%3Dtrue%26pm%5Ffposp%3D%26pm%5Ffpup%3D%26pm%5Ffpsaw%3D1440%26pm%5Ffpspd%3D24%26pm%5Ffpsbd%3D%26pm%5Ffpsdx%3D%26pm%5Ffpsdy%3D%26pm%5Ffpslx%3D%26pm%5Ffpsly%3D%26pm%5Ffpsfse%3D%26pm%5Ffpsui%3D%26pm%5Fos%3DWindows%26pm%5Fbrmjv%3D42%26pm%5Fbr%3DChrome%26pm%5Finpt%3D%26pm%5Fexpt%3D')

	// html = AnyBalance.requestPost(g_baseurl + '/n/Default.aspx', {
		// 'ctl00$ScriptManager':'ctl00$mainArea$upLogin|ctl00$mainArea$btnLogin',
		// '__EVENTTARGET': '',
		// '__EVENTARGUMENT': '',
		// '__VIEWSTATE':viewstate,
		// '__VIEWSTATEENCRYPTED': '',
		// '__EVENTVALIDATION':eventvalidation,
		// 'ctl00$mainArea$vtcUserName':prefs.login,
		// 'ctl00$mainArea$vtcPassword':prefs.password,
		// '__ASYNCPOST':true,
		// 'ctl00$mainArea$btnLogin':'Войти'
	// }, addHeaders({Referer:'https://retail.payment.ru/n/Default.aspx'}));
	html = requestAndCheckForErrors("POST", g_baseurl + '/n/Default.aspx', {
		'ctl00$ScriptManager':'ctl00$mainArea$upLogin|ctl00$mainArea$btnLogin',
		'__EVENTTARGET': '',
		'__EVENTARGUMENT': '',
		'__VIEWSTATE':viewstate,
		'__VIEWSTATEENCRYPTED': '',
		'__EVENTVALIDATION':eventvalidation,
		//'ctl00$mainArea$vtcUserName':prefs.login,
		'__VIEWSTATEGENERATOR': viewStateGenerator,
		'ctl00$mainArea$LoginInput$vtcLogin':prefs.login,
		'ctl00$mainArea$vtcPassword':prefs.password,
		'__ASYNCPOST':true,
		'ctl00$mainArea$btnLogin':'Войти'
	}, addHeaders({
		Referer: g_baseurl + '/n/Default.aspx'
	}), true);
	
	// if(!/pageRedirect/i.test(html))
		// throw new AnyBalance.Error("Не удаётся войти в интернет банк (внутренняя ошибка сайта)");
	// if(/KeyAuth/i.test(html))
		// throw new AnyBalance.Error("Для входа в интернет-банк требуются одноразовые пароли. Зайдите в интернет-банк с компьютера и отключите в Настройках требование одноразовых паролей при входе. Это безопасно, для операций по переводу денег пароли всё равно будут требоваться.");
	
	// var authHref = getParam(html, null, null, /pageRedirect\|\|([^\|]*)/i, replaceTagsAndSpaces, html_entity_decode);
	// AnyBalance.trace('Нашли ссылку ' + authHref);
	// authHref = decodeURIComponent(authHref);
	// AnyBalance.trace('Привели ссылку к нормальному виду ' + authHref);
	// // Они добавили еще один шаг авторизации, эта ссылка ставит кучу кук и возвращает 302, без нее не работает
	// html = AnyBalance.requestGet(g_baseurl + authHref, g_headers);

		
		
	
	// html = AnyBalance.requestGet(g_baseurl + '/n/Main/Home.aspx', g_headers);
	
	html = requestAndCheckForErrors("GET", g_baseurl + '/n/Main/Home.aspx', '', g_headers);
	
	
	// if(/KeyAuth/i.test(html))
		// throw new AnyBalance.Error("Для входа в интернет-банк требуются одноразовые пароли. Зайдите в интернет-банк с компьютера и отключите в Настройках требование одноразовых паролей при входе. Это безопасно, для операций по переводу денег пароли всё равно будут требоваться.");
	
	// if(/UpdateContactInfo.aspx/i.test(html))
		// throw new AnyBalance.Error("Для входа в интернет-банк требуются обновить контактную информацию. Зайдите в интернет-банк с компьютера и следуйте инструкциям.");
	
	if(prefs.type == 'card'){
        fetchCard(g_baseurl, html);
    }else if(prefs.type == 'dep'){
        fetchDeposit(g_baseurl, html);
    }else if(prefs.type == 'acc'){
        fetchAccount(g_baseurl, html);
    }else{
        fetchCard(g_baseurl, html);
    }
}

function getBonuses(g_baseurl, result){
	if(isAvailable(['bonuses', 'bonuses_grade'])) {
		html = AnyBalance.requestGet(g_baseurl + '/n/Services/BonusProgram.aspx');
		
		getParam(html, result, 'bonuses', [/class="bonusAmount"[^>]*>([^<]*)/i, /"ctl00_ctl00_mainArea_main_lblBonusAmount"[^>]*>([^<]*)/i], replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'bonuses_grade', [/Уровень\s*"([^"]*)/i, /"ctl00_ctl00_mainArea_main_lblStatus"[^>]*>([^<]*)/i], replaceTagsAndSpaces, html_entity_decode);
	}
}

function fetchCard(g_baseurl, html){
    var prefs = AnyBalance.getPreferences();

    var eventvalidation = getEventValidation(html);
    var viewstate = getViewState(html);
    if(prefs.lastdigits && !/^\d{4}$/.test(prefs.lastdigits))
        throw new AnyBalance.Error("Надо указывать 4 последних цифры карты или не указывать ничего");
    
    //Инфа о счетах схлопнута, а надо её раскрыть
    if(/<div[^>]*isDetExpandBtn[^>]*>\s*подробно/i.test(html)){
        html = AnyBalance.requestPost(g_baseurl + '/n/Main/Home.aspx', {
            ctl00$ScriptManager:'ctl00$ctl00$mainArea$main$upCards|ctl00$ctl00$mainArea$main$cardList',
            __EVENTTARGET:'ctl00$ctl00$mainArea$main$cardList',
            __EVENTARGUMENT:'_det_exp',
            __VIEWSTATE:viewstate,
            __EVENTVALIDATION:eventvalidation,
            __VIEWSTATEENCRYPTED:'',
			'ctl00$ctl00$mainArea$right$OperationSearchRightColumn$OperationSearch$tbSearch':'',
			'ctl00_ctl00_mainArea_right_OperationSearchRightColumn_OperationSearch_tbSearch_InitialTextMode':'True',
            __ASYNCPOST:true
        }, addHeaders({Referer:'https://retail.payment.ru/n/Main/Home.aspx'}));
		
		html = AnyBalance.requestGet(g_baseurl + '/n/Main/Home.aspx', addHeaders({Referer:'https://retail.payment.ru/n/Main/Home.aspx'}));
    }
	var cardnum = prefs.lastdigits ? prefs.lastdigits : '\\d{4}';
	//                   (<div[^>]*class="cardAccountBlock"(?:[^>]*>){18,32}\d+\\.\\.       5787    (?:[^>]*>){3})
    var re = new RegExp('(<div[^>]*class=\"cardAccountBlock\"(?:[^>]*>){18,32}\\d+\\.\\.' + cardnum + '(?:[^>]*>){3})', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти ' + (prefs.lastdigits ? 'карту с последними цифрами ' + prefs.lastdigits : 'ни одной карты'));
	}
	var result = {success: true};
    getParam(tr, result, 'balance', /"balanceAmountM"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(tr, result, ['currency', 'balance', 'blocked', 'balance_own'], /"balanceAmountCurrencyM"[^>]*>([^<]*)/i, replaceTagsAndSpaces);
	getParam(tr, result, 'accnum', /"infoUnitObject"[^>]*>([\s\S]*?)<\/a>/i, [replaceTagsAndSpaces, /\D/g, ''], html_entity_decode);
	getParam(tr, result, '__tariff', /"cardNumberContainer"[^>]*>[^>]*>([^<]*)/i, replaceTagsAndSpaces);
	getParam(tr, result, 'cardnum', /"cardNumberContainer"[^>]*>[^>]*>([^<]*)/i, replaceTagsAndSpaces);
	getParam(tr, result, 'type', /"cardCaption"[^>]*>([^<]*)/i, replaceTagsAndSpaces);
	
	if(AnyBalance.isAvailable('balance_own', 'blocked')){
        var href = getParam(tr, null, null, /"infoUnitObject"[^>]*href="([^"]*)/i);
        html = AnyBalance.requestGet(g_baseurl + href, g_headers);
        
        getParam(html, result, 'balance_own', /"ctl00_ctl00_mainArea_main_lblAccountBalance"[^>]*>([^<]*)/, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'blocked', /"ctl00_ctl00_mainArea_main_lblReserved"[^>]*>([^<]*)/, replaceTagsAndSpaces, parseBalance);
    }
	getBonuses(g_baseurl, result);

    AnyBalance.setResult(result);
}

function fetchAccount(g_baseurl, html){
    var prefs = AnyBalance.getPreferences();

    var eventvalidation = getEventValidation(html);
    var viewstate = getViewState(html);
    if(prefs.lastdigits && !/^\d{4}$/.test(prefs.lastdigits))
        throw new AnyBalance.Error("Надо указывать от 4 последних цифр счета или не указывать ничего");
    
    //Инфа о счетах схлопнута, а надо её раскрыть
    if(/<div[^>]*isDetExpandBtn[^>]*>\s*подробно/i.test(html)){
        html = AnyBalance.requestPost('https://retail.payment.ru/n/Main/Home.aspx', {
			'ctl00$ctl00$ScriptManager':'ctl00$ctl00$mainArea$main$upAccounts|ctl00$ctl00$mainArea$main$accountList',
			'__EVENTTARGET':'ctl00$ctl00$mainArea$main$accountList',
			'__EVENTARGUMENT':'_det_exp',
			'__VIEWSTATE':viewstate,
			'__VIEWSTATEENCRYPTED':'',
			'__EVENTVALIDATION':eventvalidation,
			'ctl00$ctl00$mainArea$right$OperationSearchRightColumn$OperationSearch$tbSearch':'',
			'ctl00_ctl00_mainArea_right_OperationSearchRightColumn_OperationSearch_tbSearch_InitialTextMode':'True',
			'__ASYNCPOST':'true',
			'':''
        }, addHeaders({Referer:'https://retail.payment.ru/n/Main/Home.aspx'}));
    }
	var cardnum = prefs.lastdigits ? prefs.lastdigits : '\\d{4}';
	//                   (<div[^>]*class="infoUnit"(?:[^>]*>){4}\d+(?:[^>]*>|)\d+8673(?:[\s\S]*?</div[^>]*>){2})
    var re = new RegExp('(<div[^>]*class="infoUnit"(?:[^>]*>){4}\\d+(?:[^>]*>|)\\d+' + cardnum + '(?:[\\s\\S]*?</div[^>]*>){2})', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr) {
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.lastdigits ? 'счет с последними цифрами ' + prefs.lastdigits : 'ни одного счета'));
	}
	
	var result = {success: true};
    getParam(tr, result, 'balance', /"balanceAmountM"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(tr, result, ['currency', 'balance', 'blocked', 'balance_own'], /"balanceAmountCurrencyM"[^>]*>([^<]*)/i, replaceTagsAndSpaces);
	getParam(tr, result, 'accnum', /"infoUnitObject"[^>]*>([\s\S]*?)<\/a>/i, [replaceTagsAndSpaces, /\D/g, ''], html_entity_decode);
	getParam(tr, result, '__tariff', /"infoUnitObject"[^>]*>([\s\S]*?)<\/a>/i, [replaceTagsAndSpaces, /\D/g, ''], html_entity_decode);
	
	if(AnyBalance.isAvailable('balance_own', 'blocked')){
        var href = getParam(tr, null, null, /"infoUnitObject"[^>]*href="([^"]*)/i);
        html = AnyBalance.requestGet(g_baseurl + href, g_headers);
        getParam(html, result, 'blocked', /"ctl00_ctl00_mainArea_main_lblReserved"[^>]*>([^<]*)/, replaceTagsAndSpaces, parseBalance);
    }
	getBonuses(g_baseurl, result);

    AnyBalance.setResult(result);	
}

// // Парсит дату из такого вида в мс 27 июля 2013
// function parseDateMoment(str){
	// AnyBalance.trace('Trying to parse date from ' + str);
	// return getParam(str, null, null, null, [replaceTagsAndSpaces, /января/i, '.01.', /февраля/i, '.02.', /марта/i, '.03.', /апреля/i, '.04.', /мая/i, '.05.', /июня/i, '.06.', /июля/i, '.07.', /августа/i, '.08.', /сентября/i, '.09.', /октября/i, '.10.', /ноября/i, '.11.', /декабря/i, '.12.', /\s/g, ''], parseDate);
// }

function fetchDeposit(g_baseurl, html){
    var prefs = AnyBalance.getPreferences();
    var eventvalidation = getEventValidation(html);
    var viewstate = getViewState(html);
    
    //Инфа о депозитах схлопнута, а надо её раскрыть
    if(/<div[^>]*isDetExpandBtn[^>]*>\s*подробно/i.test(html)){
        html = AnyBalance.requestPost('https://retail.payment.ru/n/Main/Home.aspx', {
			'ctl00$ctl00$ScriptManager':'ctl00$ctl00$mainArea$main$upDeposits|ctl00$ctl00$mainArea$main$depositList',
			'__EVENTTARGET':'ctl00$ctl00$mainArea$main$depositList',
			'__EVENTARGUMENT':'_det_exp',
			'__VIEWSTATE':viewstate,
			'__VIEWSTATEENCRYPTED':'',
			'__EVENTVALIDATION':eventvalidation,
			'ctl00$ctl00$mainArea$right$OperationSearchRightColumn$OperationSearch$tbSearch':'',
			'ctl00_ctl00_mainArea_right_OperationSearchRightColumn_OperationSearch_tbSearch_InitialTextMode':'True',
			'__ASYNCPOST':'true',
			'':'',
        }, addHeaders({Referer:'https://retail.payment.ru/n/Main/Home.aspx'}));
    }
	var deposit = prefs.lastdigits ? getParam(prefs.lastdigits, null, null, null, [/\(/ig, '\\(', /\)/ig, '\\)']) : '>';
	//                   (<div[^>]*class="infoUnit"(?:[^>]*>){4}[^>]*Офис(?:[\s\S]*?</div[^>]*>){2})
    var re = new RegExp('(<div[^>]*class="infoUnit"(?:[^>]*>){4}[^>]*' + deposit + '(?:[\\s\\S]*?</div[^>]*>){2})', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.lastdigits ? 'депозит с именем ' + prefs.lastdigits : 'ни одного депозита'));
	
	var result = {success: true};
    getParam(tr, result, 'balance', /"balanceAmountM"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(tr, result, ['currency', 'balance', 'blocked', 'balance_own'], /"balanceAmountCurrencyM"[^>]*>([^<]*)/i, replaceTagsAndSpaces);
	getParam(tr, result, 'accnum', /"infoUnitObject"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, '__tariff', /"infoUnitObject"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
	
	if(AnyBalance.isAvailable('balance_own', 'blocked')) {
        var href = getParam(tr, null, null, /"infoUnitObject"[^>]*href="([^"]*)/i);
        html = AnyBalance.requestGet(g_baseurl + href, g_headers);

		getParam(html, result, 'income', /Ожидаемый доход(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'accnum', /Депозитный счет(?:[^>]*>){3}([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, /\D/g, ''], html_entity_decode);
		getParam(html, result, 'till', /Фактическая дата закрытия(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseDateWord);
    }
	getBonuses(g_baseurl, result);

    AnyBalance.setResult(result);		
}