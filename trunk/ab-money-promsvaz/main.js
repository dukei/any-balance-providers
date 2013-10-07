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

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function getEventValidation(html){
    return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/);
}

function getViewState1(html){
    return getParam(html, null, null, /__VIEWSTATE\|([^\|]*)/);
}

function getEventValidation1(html){
    return getParam(html, null, null, /__EVENTVALIDATION\|([^\|]*)/);
}

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://retail.payment.ru";
    AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, "Пожалуйста, укажите логин для входа в интернет-банк Промсвязбанка!");
	checkEmpty(prefs.password, "Пожалуйста, укажите пароль для входа в интернет-банк Промсвязбанка!");

    var html = AnyBalance.requestGet(baseurl + '/n/Default.aspx', g_headers);
    var eventvalidation = getEventValidation(html);
    var viewstate = getViewState(html);

	html = AnyBalance.requestPost(baseurl + '/n/Default.aspx', {
		'ctl00$ScriptManager':'ctl00$mainArea$upLogin|ctl00$mainArea$btnLogin',
		'__EVENTTARGET': '',
		'__EVENTARGUMENT': '',
		'__VIEWSTATE':viewstate,
		'__VIEWSTATEENCRYPTED': '',
		'__EVENTVALIDATION':eventvalidation,
		'ctl00$mainArea$vtcUserName':prefs.login,
		'ctl00$mainArea$vtcPassword':prefs.password,
		'__ASYNCPOST':true,
		'ctl00$mainArea$btnLogin':'Войти'
	}, addHeaders({Referer:'https://retail.payment.ru/n/Default.aspx'}));
		
    var error = getParam(html, null, null, /<div[^>]*class="errorMessage"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	if(error)
		throw new AnyBalance.Error(error);
	if(!/pageRedirect/i.test(html))
		throw new AnyBalance.Error("Не удаётся войти в интернет банк (внутренняя ошибка сайта)");

	if(/KeyAuth/i.test(html))
		throw new AnyBalance.Error("Для входа в интернет-банк требуются одноразовые пароли. Зайдите в интернет-банк с компьютера и отключите в Настройках требование одноразовых паролей при входе. Это безопасно, для операций по переводу денег пароли всё равно будут требоваться.");

	var authHref = getParam(html, null, null, /pageRedirect\|\|([^\|]*)/i, replaceTagsAndSpaces, html_entity_decode);
	AnyBalance.trace('Нашли ссылку ' + authHref);
	authHref = decodeURIComponent(authHref);
	AnyBalance.trace('Привели ссылку к нормальному виду ' + authHref);
	// Они добавили еще один шаг авторизации, эта ссылка ставит кучу кук и возвращает 302, без нее не работает
	html = AnyBalance.requestGet(baseurl + authHref, g_headers);
	html = AnyBalance.requestGet(baseurl + '/n/Main/Home.aspx', g_headers);

    if(/KeyAuth/i.test(html))
        throw new AnyBalance.Error("Для входа в интернет-банк требуются одноразовые пароли. Зайдите в интернет-банк с компьютера и отключите в Настройках требование одноразовых паролей при входе. Это безопасно, для операций по переводу денег пароли всё равно будут требоваться.");

    if(prefs.type == 'card'){
        fetchCard(baseurl, html);
    }else if(prefs.type == 'dep'){
        fetchDeposit(baseurl, html);
    }else if(prefs.type == 'acc'){
        fetchAccount(baseurl, html);
    }else{
        fetchCard(baseurl, html);
    }
}

function getBonuses(baseurl, result){
	if(isAvailable(['bonuses', 'bonuses_grade'])) {
		html = AnyBalance.requestGet(baseurl + '/n/Services/BonusProgram.aspx');
		getParam(html, result, 'bonuses', [/class="bonusAmount"[^>]*>([^<]*)/i, /"ctl00_ctl00_mainArea_main_lblBonusAmount"[^>]*>([^<]*)/i], replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'bonuses_grade', [/Уровень\s*"([^"]*)/i, /"ctl00_ctl00_mainArea_main_lblStatus"[^>]*>([^<]*)/i], replaceTagsAndSpaces, html_entity_decode);
	}
}

function fetchCard(baseurl, html){
    var prefs = AnyBalance.getPreferences();

    var eventvalidation = getEventValidation(html);
    var viewstate = getViewState(html);
    if(prefs.lastdigits && !/^\d{4}$/.test(prefs.lastdigits))
        throw new AnyBalance.Error("Надо указывать 4 последних цифры карты или не указывать ничего");
    
    //Инфа о счетах схлопнута, а надо её раскрыть
    if(/<div[^>]*isDetExpandBtn[^>]*>\s*подробно/i.test(html)){
        html = AnyBalance.requestPost(baseurl + '/n/Main/Home.aspx', {
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
		
		html = AnyBalance.requestGet(baseurl + '/n/Main/Home.aspx', addHeaders({Referer:'https://retail.payment.ru/n/Main/Home.aspx'}));
    }
	var cardnum = prefs.lastdigits ? prefs.lastdigits : '\\d{4}';
	//                   (<div[^>]*class="cardAccountBlock"(?:[^>]*>){18,22}\d+\\.\\.       5787    (?:[^>]*>){3})
    var re = new RegExp('(<div[^>]*class=\"cardAccountBlock\"(?:[^>]*>){18,22}\\d+\\.\\.' + cardnum + '(?:[^>]*>){3})', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.contract ? 'карту с последними цифрами ' + prefs.contract : 'ни одной карты'));
	
	var result = {success: true};
    getParam(tr, result, 'balance', /"balanceAmountM"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(tr, result, ['currency', 'balance', 'blocked', 'balance_own'], /"balanceAmountCurrencyM"[^>]*>([^<]*)/i, replaceTagsAndSpaces);
	getParam(tr, result, 'accnum', /"infoUnitObject"[^>]*>([\s\S]*?)<\/a>/i, [replaceTagsAndSpaces, /\D/, ''], html_entity_decode);
	getParam(tr, result, '__tariff', /"cardNumberContainer"[^>]*>[^>]*>([^<]*)/i, replaceTagsAndSpaces);
	getParam(tr, result, 'cardnum', /"cardNumberContainer"[^>]*>[^>]*>([^<]*)/i, replaceTagsAndSpaces);
	getParam(tr, result, 'type', /"cardCaption"[^>]*>([^<]*)/i, replaceTagsAndSpaces);
	
	if(AnyBalance.isAvailable('balance_own', 'blocked')){
        var href = getParam(tr, null, null, /"infoUnitObject"[^>]*href="([^"]*)/i);
        html = AnyBalance.requestGet(baseurl + href, g_headers);
        
        getParam(html, result, 'balance_own', /"ctl00_ctl00_mainArea_main_lblAccountBalance"[^>]*>([^<]*)/, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'blocked', /"ctl00_ctl00_mainArea_main_lblReserved"[^>]*>([^<]*)/, replaceTagsAndSpaces, parseBalance);
    }
	getBonuses(baseurl, result);

    /*var lastdigits = prefs.lastdigits ? prefs.lastdigits : '\\d{4}';
    
    var $html = $('<div>' + html + '</div>');
    var $card = $html.find("div.cardListUnit").filter(function(){
        var num = $('.cardNumber', this).first().text();
        return new RegExp(lastdigits + '$').test(num);
    }).first();

    if($card.length <= 0)
        throw new AnyBalance.Error(prefs.lastdigits ? "Не удаётся найти карту с последними цифрами " + prefs.lastdigits : "Не удаётся найти ни одной карты!");
    
    var result = {success: true};
	getBonuses(baseurl, result);
    result.__tariff = $card.find(".cardNumber").text();
    if(AnyBalance.isAvailable('cardnum'))
        result.cardnum = $card.find(".cardNumber").text();
    if(AnyBalance.isAvailable('type'))
        result.type = $card.find(".infoUnitInlineAddDesc").text();
    getParam($card.find("a.cardAccount").text(), result, 'accnum', /(.*)/, replaceTagsAndSpaces);
    getParam($card.find(".infoUnitAmount").text(), result, 'balance', /(.*)/, replaceTagsAndSpaces, parseBalance);
    getParam($card.find(".infoUnitAmount").text(), result, ['currency', 'balance', 'blocked', 'balance_own'], /(.*)/, replaceTagsAndSpaces, parseCurrency);
    
    if(AnyBalance.isAvailable('balance_own', 'blocked')){
        eventvalidation = getEventValidation1(html);
        viewstate = getViewState1(html);
        
        var href = $card.find('a.cardAccount').attr('href');
        html = AnyBalance.requestGet(baseurl + href);
        
        getParam(html, result, 'balance_own', /ctl00_main_lblAccountBalance[^>]*>([^<]*)/, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'blocked', /ctl00_main_lblReserved[^>]*>([^<]*)/, replaceTagsAndSpaces, parseBalance);
    }*/

    AnyBalance.setResult(result);
}

function fetchAccount(baseurl, html){
    var prefs = AnyBalance.getPreferences();

    var eventvalidation = getEventValidation(html);
    var viewstate = getViewState(html);
    if(prefs.lastdigits && !/^\d{4}$/.test(prefs.lastdigits))
        throw new AnyBalance.Error("Надо указывать от 4 последних цифр счета или не указывать ничего");
    
    if(!/<[^>]+infoSectionHeaderExpanded[^>]+ctl00_main_accountList_Header/i.test(html)){
        html = AnyBalance.requestPost(baseurl + '/n/Main/Home.aspx', {
            ctl00$ScriptManager:'ctl00$main$upAccounts|ctl00$main$accountList',
            __EVENTTARGET:'ctl00$main$accountList',
            __EVENTARGUMENT:'exp',
            __VIEWSTATE:viewstate,
            __EVENTVALIDATION:eventvalidation,
            __VIEWSTATEENCRYPTED:'',
            __ASYNCPOST:true
        });
    }

    //Сколько цифр осталось, чтобы дополнить до 20
    var accnum = prefs.lastdigits || '';
    var accprefix = accnum.length;
    accprefix = 20 - accprefix;

    var re = new RegExp((accprefix > 0 ? '\\d{' + accprefix + '}' : '') + accnum, 'i');
    var lastdigits = prefs.lastdigits ? prefs.lastdigits : '\\d{4}';
    
    var $html = $('<div>' + html + '</div>');
    var $card = $html.find("#ctl00_main_accountList div.infoUnit").filter(function(){
        var num = replaceAll($('.infoUnitObject', this).first().text(), replaceTagsAndSpaces);
        return re.test(num);
    }).first();

    if($card.length <= 0)
        throw new AnyBalance.Error(prefs.lastdigits ? "Не удаётся найти счет с последними цифрами " + prefs.lastdigits : "Не удаётся найти ни одного счета!");
    
    var result = {success: true};
	getBonuses(baseurl, result);
    result.__tariff = replaceAll($card.find(".infoUnitCaption").text(), replaceTagsAndSpaces);;
    if(AnyBalance.isAvailable('accnum'))
        result.cardnum = $card.find(".infoUnitObject").text();
    if(AnyBalance.isAvailable('type'))
        result.type = result.__tariff;
    getParam($card.find(".infoUnitAmount").text(), result, 'balance', /(.*)/, replaceTagsAndSpaces, parseBalance);
    getParam($card.find(".infoUnitAmount").text(), result, ['currency', 'balance', 'blocked'], /(.*)/, replaceTagsAndSpaces, parseCurrency);
    
    if(AnyBalance.isAvailable('balance_own', 'blocked')){
        eventvalidation = getEventValidation1(html);
        viewstate = getViewState1(html);
        
        var href = $card.find('a.infoUnitObject').attr('href');
        html = AnyBalance.requestGet(baseurl + href);
        
        getParam(html, result, 'blocked', /ctl00_main_lblReserved[^>]*>([^<]*)/, replaceTagsAndSpaces, parseBalance);
    }
    
    AnyBalance.setResult(result);
}


function parseDateMoment(str){
    var mom = moment(str, 'DD MMM YYYY');
    if(!mom || !mom.isValid()){
        AnyBalance.trace('Failed to parse date from ' + str);
    }else{
        var val = mom.toDate();
        AnyBalance.trace('Parsed date ' + val + ' from ' + str);
        return val.getTime();
    }
}

function fetchDeposit(baseurl, html){
    var prefs = AnyBalance.getPreferences();

    moment.lang('ru');

    var eventvalidation = getEventValidation(html);
    var viewstate = getViewState(html);
    
    if(!/<[^>]+infoSectionHeaderExpanded[^>]+ctl00_main_depositList_Header/i.test(html)){
        html = AnyBalance.requestPost(baseurl + '/n/Main/Home.aspx', {
            ctl00$ScriptManager:'ctl00$main$upDeposits|ctl00$main$depositList',
            __EVENTTARGET:'ctl00$main$depositList',
            __EVENTARGUMENT:'exp',
            __VIEWSTATE:viewstate,
            __EVENTVALIDATION:eventvalidation,
            __VIEWSTATEENCRYPTED:'',
            __ASYNCPOST:true
        });
    }

    //Сколько цифр осталось, чтобы дополнить до 20
    var $html = $('<div>' + html + '</div>');
    var $card = $html.find("#ctl00_main_depositList div.twoColumnBlock").filter(function(){
        var num = replaceAll($('.twoColumnBlockCaption', this).first().text(), replaceTagsAndSpaces);
        return prefs.lastdigits ? num.indexOf(prefs.lastdigits) >= 0 : true;
    }).first();

    if($card.length <= 0)
        throw new AnyBalance.Error(prefs.lastdigits ? "Не удаётся найти депозит с названием " + prefs.lastdigits : "Не удаётся найти ни одного депозита!");
    
    var result = {success: true};
	getBonuses(baseurl, result);	
    result.__tariff = $.trim($card.find(".twoColumnBlockCaption").text());
    if(AnyBalance.isAvailable('type'))
        result.type = $.trim($card.find(".depositReplenishment").text());
    getParam($card.find(".depositEndDate").text(), result, 'till', /(\d+.*)/, replaceTagsAndSpaces, parseDateMoment);
    getParam($card.find(".depositBalanceAmount").text(), result, 'balance', /(.*)/, replaceTagsAndSpaces, parseBalance);
    getParam($card.find(".depositBalanceAmount").text(), result, ['currency', 'balance', 'income'], /(.*)/, replaceTagsAndSpaces, parseCurrency);
    
    if(AnyBalance.isAvailable('accnum','income')){
        eventvalidation = getEventValidation1(html);
        viewstate = getViewState1(html);
        
        var href = $card.find('a.twoColumnBlockCaption').attr('href');
        html = AnyBalance.requestGet(baseurl + href);
        
        getParam(html, result, 'accnum', /Депозитный счет[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'income', /Ожидаемый доход[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
   }
    
    AnyBalance.setResult(result);
}