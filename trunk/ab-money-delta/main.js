/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function getEventValidation(html){
    return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/);
}

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Encoding':'gzip, deflate',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
	'Connection':'keep-alive',
	'Referer':'https://online.deltabank.com.ua/Pages/User/LogOn.aspx',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:23.0) Gecko/20100101 Firefox/23.0',
}

function main(){
    var prefs = AnyBalance.getPreferences();

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    if(prefs.accnum && !/^\d{4,}$/.test(prefs.accnum))
		throw new AnyBalance.Error("Введите не меньше 4 последних цифр номера счета или не вводите ничего, чтобы показать информацию по первому счету.");
	
    var demo = prefs.login == '1';
    var baseurl = !demo ? "https://online.deltabank.com.ua/" : "https://online.deltabank.com.ua/DEMO/";
    
    var html = AnyBalance.requestGet(baseurl + 'Pages/User/LogOn.aspx', g_headers);
	
    var captcha_word = '';
    if (!demo) {
    	if (AnyBalance.getLevel() >= 7) {
    		AnyBalance.trace('Пытаемся ввести капчу');
    		var href = getParam(html, null, null, /(CaptchaImage.aspx[^>]*?)"/);
    		var captcha = AnyBalance.requestGet(baseurl + 'Pages/' + href);
    		captcha_word = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
    		AnyBalance.trace('Капча получена: ' + captcha_word);
    	} else {
    		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
    	}
    }
    var viewstate = getViewState(html);
    var eventvalidation = getEventValidation(html);
    if (!demo) {
    	html = AnyBalance.requestPost(baseurl + 'Pages/User/LogOn.aspx', {
    		'__EVENTARGUMENT': '',
    		'__EVENTTARGET': '',
    		'__EVENTVALIDATION': eventvalidation,
    		'__SCROLLPOSITIONX': 0,
    		'__SCROLLPOSITIONY': 0,
    		'__VIEWSTATE': viewstate,
    		'__VIEWSTATEENCRYPTED': '',
    		'wzLogin$logOn_Step1$divLogin$btnLoginCaptcha.x': 0,
    		'wzLogin$logOn_Step1$divLogin$btnLoginCaptcha.y': 0,
    		'wzLogin$logOn_Step1$divLogin$txtCaptcha': captcha_word,
    		'wzLogin$logOn_Step1$divLogin$txtLoginCaptcha': prefs.login,
    		'wzLogin$logOn_Step1$divLogin$txtPassCaptcha': prefs.password,
    	}, g_headers);
    } else {
    	html = AnyBalance.requestPost(baseurl + 'Pages/User/LogOn.aspx', {
    		__EVENTTARGET: '',
    		__EVENTARGUMENT: '',
    		__VIEWSTATE: viewstate,
    		__VIEWSTATEENCRYPTED: '',
    		__EVENTVALIDATION: eventvalidation,
    		wzLogin$tbLogin: prefs.login,
    		wzLogin$tbPassword: prefs.password,
    		'wzLogin$btnLogOn.x': 54,
    		'wzLogin$btnLogOn.y': 10,
    	}, g_headers);
    }
	
	if (!/ctl00\$btnLogout/i.test(html)) {
		var error = getParam(html, null, null, /<span[^>]+id="overlayingErrorMessage_lblMessage">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в интернет-банк. Сайт изменен?');
	}
	
	/*if (prefs.type == 'cred') 
		fetchAcc(html);
	else 
		fetchCard(html, baseurl);*/

    //Сколько цифр осталось, чтобы дополнить до 16
    var accnum = prefs.accnum || '';
    var accprefix = accnum.length;
    accprefix = 12 - accprefix;

    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<\\/tr>))*?>\\s*' + (accprefix > 0 ? '\\d{' + accprefix + ',}' : '') + accnum + '\\s+[\\s\\S]*?<\\/tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (accnum ? 'счет с последними цифрами ' + accnum : 'ни одного счета'));

    var result = {success: true};
    var type = getParam(tr, null, null, /<input[^>]*name="([^"]*)/i);
	
	if(!isset(type) && /Кредитна/i.test(tr)) {
		type = 'CreditCard';
	}
	
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){3}(?:\s*<[^>]*>)*\s*(\d+)/i, replaceTagsAndSpaces);
    getParam(tr, result, 'accname', /(?:[\s\S]*?<td[^>]*>){3}(?:\s*<[^>]*>)*\s*\d+([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

    switch (type) {
        case 'CurrentAccount':
        case 'DebitAccount':
        	getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        	getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
        	break;
        case 'CreditAccount':
        	getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        	getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
        	getParam(tr, result, 'limit', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        	break;
        case 'Deposit':
        	getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        	getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
        	getParam(tr, result, 'till', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        	break;
        case 'Loan':
        	getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        	getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
        	getParam(tr, result, 'pay', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        	getParam(tr, result, 'paytill', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        	break;

        case 'CreditCard':
        	getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        	getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
			
			getParam(tr, result, 'accnum', /(\d{10,})/i, replaceTagsAndSpaces);
			getParam(tr, result, 'accname', /\d{10,}([^<]+)/i, replaceTagsAndSpaces);			
			
			getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
			
        	break;			
		
    }

    if(AnyBalance.isAvailable('agreement', 'pct', 'monthlypay', 'debt', 'pay', 'paytill')){
        var nametd = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i);
        var id = getParam(nametd || '', null, null, /__doPostBack\s*\(\s*'([^']*)/i);
        if(id){
            html = AnyBalance.requestPost(baseurl + 'Pages/User/MainPage.aspx', {
                __EVENTTARGET: id,
                __EVENTARGUMENT: '',
                __VIEWSTATE: getViewState(html),
                __VIEWSTATEENCRYPTED: '',
                __PREVIOUSPAGE: getParam(html, null, null, /name="__PREVIOUSPAGE"[^>]*value="([^"]*)/i),
                __EVENTVALIDATION: getEventValidation(html)
            }, g_headers);
        
            getParam(html, result, 'agreement', /(?:Номер\s+договора|Номер\s+договору)[\s\S]*?<div[^>]+class="value"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
            getParam(html, result, 'pct', /(?:Процентная ставка|Процентна ставка)[\s\S]*?<div[^>]+class="value"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'monthlypay', /(?:Ежемесячный платеж|Щомісячний платіж)[\s\S]*?<div[^>]+class="value"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'debt', /(?:Остаток задолженности|Залишок заборгованості)[\s\S]*?<div[^>]+class="value"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
        
            getParam(html, result, 'pay', /(?:Будущий обязательный платеж|Майбутній обов'язковий платіж)[\s\S]*?<div[^>]+class="value"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'paytill', /(?:Дата будущего платежа|Дата майбутнього платежу)[\s\S]*?<div[^>]+class="value"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
            getParam(html, result, 'debt', /(?:Общая задолженность|Загальна заборгованість)[\s\S]*?<div[^>]+class="value"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
        }else{
            AnyBalance.trace('Не удалось получить ссылку на подробные сведения о счете');
        }
    }

    AnyBalance.setResult(result);
	
}

function fetchCard(html, baseurl) {
	var prefs = AnyBalance.getPreferences();
	if (prefs.lastdigits && !/^\d{4}$/.test(prefs.lastdigits)) 
		throw new AnyBalance.Error("Надо указывать 4 последних цифры карты или не указывать ничего");
	
	var result = {success: true};
	// Иногда мы не переходим на нужную страницу, из-за каких-то глюков.
	html = AnyBalance.requestPost(baseurl + 'frontend/frontend', {
		'RQ_TYPE':'WORK',
		'SCREEN_ID':'MAIN',
		'MENU_ID':'MENU',
		'ITEM_ID':'MENU_CLICK',
		SID:getSID(html),
		'Step_ID':'0',
		'CP_MENU_ITEM_ID':'SFMAIN_MENU.WB_PRODUCTS_ALL',
	}, addHeaders({Referer: baseurl + 'frontend/frontend'}));
	
	html = AnyBalance.requestPost(baseurl + 'frontend/frontend', {
		'RQ_TYPE':'WORK',
		'SCREEN_ID':'MAIN',
		'MENU_ID':'MENU',
		'ITEM_ID':'MENU_CLICK',
		SID:getSID(html),
		'Step_ID':'1',
		'CP_MENU_ITEM_ID':'CARDS.CARD_LIST',
	}, addHeaders({Referer: baseurl + 'frontend/frontend'}));
	
	getParam(html, result, 'userName', /ibec_header_right">\s*<b>([\s\S]*?)<\//i, replaceTagsAndSpaces);
	
	// Пока мы не знаем как выглядит счет с несколькими картами, поэтому сделал как было, вроде должно сработать если что.
	var cardnum = prefs.lastdigits || '\\d{3}';
	var regExp = new RegExp('<root>(?:[\\s\\S]*?<name[^>]*>){12}\\d{3}\\*+' + cardnum + '[\\s\\S]*?</root>','i');
	
	var root = getParam(html, null, null, regExp);
	if(!root){
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.lastdigits ? 'карту с последними цифрами ' + prefs.lastdigits : 'ни одной карты!'));
	}
	
	getParam(root, result, 'balance', /\d{3}\*+\d{3}[\s\S]*?class='ibec_balance'(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(root, result, ['currency', 'balance'], /\d{3}\*+\d{3}[\s\S]*?class='ibec_balance'(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseCurrency);
	getParam(root, result, '__tariff', /(\d{3}\*+\d{3})/i);
	result.cardNumber = result.__tariff;

	AnyBalance.setResult(result);
}