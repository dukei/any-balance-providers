﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru,en;q=0.8',
	'Connection': 'keep-alive',
	'Cache-Control': 'max-age=0',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setOptions({SSL_ENABLED_PROTOCOLS: ['TLSv1.2']});

    var baseurl = "https://ibank.asb.by/";
    AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Пожалуйста, укажите логин для входа в интернет-банк Беларусбанка!');
	checkEmpty(prefs.password, 'Пожалуйста, укажите пароль для входа в интернет-банк Беларусбанка!');
	
    if(!prefs.codes0 || !/^\s*(?:\d{4}\s+){9}\d{4}\s*$/.test(prefs.codes0))
        throw new AnyBalance.Error("Неправильно введены коды 1-10! Необходимо ввести 10 четырехзначных кодов через пробел.");
    if(!prefs.codes1 || !/^\s*(?:\d{4}\s+){9}\d{4}\s*$/.test(prefs.codes1))
        throw new AnyBalance.Error("Неправильно введены коды 11-20! Необходимо ввести 10 четырехзначных кодов через пробел.");
    if(!prefs.codes2 || !/^\s*(?:\d{4}\s+){9}\d{4}\s*$/.test(prefs.codes2))
        throw new AnyBalance.Error("Неправильно введены коды 21-30! Необходимо ввести 10 четырехзначных кодов через пробел.");
    if(!prefs.codes3 || !/^\s*(?:\d{4}\s+){9}\d{4}\s*$/.test(prefs.codes3))
        throw new AnyBalance.Error("Неправильно введены коды 31-40! Необходимо ввести 10 четырехзначных кодов через пробел.");
      
    var html = AnyBalance.requestGet(baseurl + 'wps/portal/ibank/', g_headers);
    var url = getParam(html, /<form[^>]+action="([^"]*)"[^>]*name="LoginForm1"/i, [replaceHtmlEntities, /#.*$/, '']);
    if(!url){
        var error = getParam(html, /<font[^>]+color="#FF0000"[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces);
        if(!error)
        	error = getElement(html, /<div[^>]+infotext/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
    }

    var htmlCodePage = html = AnyBalance.requestPost(joinUrl(AnyBalance.getLastUrl(), url), {
        bbIbUseridField:prefs.login,
        bbIbPasswordField:prefs.password,
        bbIbLoginAction:'in-action',
		bbibCodeSMSField:'0',
		bbibUnblockAction:'',
		bbibChangePwdByBlockedClientAction_sendSMS:''
    }, addHeaders({
    	Referer: AnyBalance.getLastUrl()
    }));

    if(/bbIbPasswordField/i.test(html)){
    	AnyBalance.trace('С первого раза не пустили. Попробуем ещё разок');
        
    	url = getParam(html, /<form[^>]+action="([^"]*)"[^>]*name="LoginForm1"/i, [replaceHtmlEntities, /#.*$/, '']);
        htmlCodePage = html = AnyBalance.requestPost(joinUrl(AnyBalance.getLastUrl(), url), {
            bbIbUseridField:prefs.login,
            bbIbPasswordField:prefs.password,
            bbIbLoginAction:'in-action',
			bbibCodeSMSField:'0',
			bbibUnblockAction:'',
			bbibChangePwdByBlockedClientAction_sendSMS:''
        }, addHeaders({
        	Referer: AnyBalance.getLastUrl()
        }));
    }

    var codenum = getParam(html, /Введите[^>]*>код [N№]\s*(\d+)/i, null, parseBalance);
    if(!codenum){
        var error = getParam(html, /<p[^>]+class="(?:warning|error)"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в интернет-банк. Сайт изменен?');
    }

    codenum -= 1; //Потому что у нас коды с 0 нумеруются

    var col = Math.floor(codenum / 10);
    var idx = codenum % 10;
    var codes = replaceAll(prefs['codes' + col], replaceTagsAndSpaces);
    if(!codes)
        throw new AnyBalance.Error('Не введены коды ' + (col+1) + '1-' + (col+2) + '0');

	var form = getParam(html, /<form[^>]+action="[^"]*"[^>]*name="LoginForm1"[\s\S]*?<\/form>/i);
	if(!form){
        AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму ввода кода. Сайт изменен?');
	}

	var url = getParam(form, /<form[^>]+action="([^"]*)"[^>]*name="LoginForm1"/i, [replaceHtmlEntities, /#.*$/, '']);
    /*if(!url)
        throw new AnyBalance.Error('Не удалось найти форму ввода кода. Сайт изменен?');*/

    codes = codes.split(/\D+/g);
    var code = codes[idx];
    if(!code)
        throw new AnyBalance.Error('Не введен код № ' + (codenum+1));
	
	var params = createFormParams(form, function(params, str, name, value) {
		if (name == 'bbIbCodevalueField') 
			return code;

		return value;
	});	
	
	params.bbIbLoginAction = 'in-action';
	
    html = AnyBalance.requestPost(joinUrl(AnyBalance.getLastUrl(), url), params);

    if(!/portalLogoutLink/i.test(html)){
        var error = getParam(html, /<p[^>]+class="warning"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error + '( код №' + (codenum+1) + ': ' + code + ')');

        if(/bbIbNewPasswordConfirmField/i.test(html))
            throw new AnyBalance.Error('Интернет банк требует сменить пароль. Пожалуйста, зайдите в интернет банк через браузер, смените пароль, затем новый пароль введите в настройки провайдера.', null, true);
		
        AnyBalance.trace('******* Страница запроса кода *******');
        AnyBalance.trace(htmlCodePage);
        AnyBalance.trace('******* Страница ответа на ввод кода *******');
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в интернет-банк после ввода кода (№' + (codenum+1) + ': ' + code + ') . Сайт изменен?');
    }
	
	var addinfo;
	
	var fio = getParam(html, /<div[^>]+class="greetingDiv"[\s\S]*?(?:[^>]*>){6}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	fio += ' ' + getParam(html, /<div[^>]+class="greetingDiv"[\s\S]*?(?:[^>]*>){9}([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	
	var messages = getParam(html, /<span[^>]+CountMessagesForm:themeField[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	var events = getParam(html, /<span[^>]+EventCountForm:themeField[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	
	addinfo = {
		fio: fio,
		messages: messages,
		events: events
	};
	
	var href = getParam(html, /href="\/([^"]+)">\s*Счета/i, [replaceTagsAndSpaces, /#.*$/, '']);
	checkEmpty(href, 'Не удалось найти ссылку на счета, сайт изменен?', true);
	html = AnyBalance.requestGet(baseurl + href, addHeaders({'Referer': baseurl}));
	
	switch(prefs.type){
	case 'card':
        fetchCard(baseurl, html, addinfo);
		break;
    case 'dep':
        fetchDeposit(baseurl, html, addinfo);
		break;
	case 'auto':
    default:
        fetchCard(baseurl, html, addinfo);
		break;
	}
}

function findAccount(html){
    var prefs = AnyBalance.getPreferences();
    var accnum, cards, card, cardnum, account;

    var accountsArea = getElement(html, /<table[^>]+id="[^"]*ClientCardsDataForm:accountContainer"[^>]*>/i);
    if(!accountsArea){
    	AnyBalance.trace('Не удалось найти таблицу счетов!');
    	AnyBalance.trace(html);
    	return null;
    }
    	
    var accounts = getElements(accountsArea, /<tr[^>]*>/ig);
    AnyBalance.trace('Найдено ' + accounts.length + ' счетов');

    for(var i=0; i<accounts.length; ++i){
    	account = accounts[i];
    	accnum = getParam(account, /<td[^>]+class="tdId"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    	if(!accnum)
    		accnum = getParam(account, /'accountNumber'\s*,\s*'([^']*)/i, replaceHtmlEntities);

    	cards = getElements(account, [/<table[^>]+id="[^"]*ClientCardsDataForm:accountContainer:[^>]*>/ig, /<td[^>]+class="tdNumber"/i]);
    	var cardnums = sumParam(account, /<td[^>]+class="tdNumber"[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces);
    	
    	var ok = !prefs.lastdigits || endsWith(accnum.replace(/\s+/g, ''), prefs.lastdigits);
    	for(var j=0; !ok && j<cardnums.length; ++j){
    		cardnum = cardnums[j];
    		ok = ok || endsWith(cardnum, prefs.lastdigits);
    	}

    	AnyBalance.trace("Account number " + accnum + ' with cards ' + cardnums.join(', ') + ': ' + ok);
    	if(ok)
    		return {
    			accnum: accnum,
    			cards: cards,
    			card: card || cards[0],
    			cardnum: cardnum,
    			account: account
    		};
    }

    return null;
}

function findDeposit(html){
    var prefs = AnyBalance.getPreferences();
    var accnum, account;

    var accountsArea = getElement(html, /<table[^>]+id="[^"]*CsrubDepositListForm:ibDepositList"[^>]*>/i);
    if(!accountsArea){
    	AnyBalance.trace('Не удалось найти таблицу депозитов!');
    	AnyBalance.trace(html);
    	return null;
    }
    	
    var accounts = getElements(accountsArea, [/<tr[^>]*>/ig, /<td>/i]);
    AnyBalance.trace('Найдено ' + accounts.length + ' депозитов');

    for(var i=0; i<accounts.length; ++i){
    	account = accounts[i];
    	accnum = getParam(account, /<td[^>]*class="tdNoPadding"[\s\S]*?(?:[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    	
    	var ok = !prefs.lastdigits || endsWith(accnum.replace(/\s+/g, ''), prefs.lastdigits);
    	ok = ok || endsWith(accnum, prefs.lastdigits);

    	AnyBalance.trace("Account number " + accnum + ': ' + ok);
    	if(ok)
    		return {
    			accnum: accnum,
    			account: account
    		};
    }

    return null;
}

function fetchCard(baseurl, html, addinfo){
    var prefs = AnyBalance.getPreferences();

    if(prefs.lastdigits && !/^\d{4,}$/.test(prefs.lastdigits))
        throw new AnyBalance.Error("Надо указывать 4 последних цифры карты или не менее 4 последних цифр счета или не указывать ничего");
	
	var href = getParam(html, /href="\/([^"]+)"(?:[^>]*>){1,2}\s*Счета с карточкой/i, replaceTagsAndSpaces);
	checkEmpty(href, 'Не удалось найти ссылку на счета, сайт изменен?', true);
	html = AnyBalance.requestGet(baseurl + href, addHeaders({'Referer': baseurl}));

    var info = findAccount(html);

    if(!info)
        throw new AnyBalance.Error(prefs.lastdigits ? "Не найден счет/карта с последними цифрами " + prefs.lastdigits : "Не найдено ни одного счета/карты");

    if(info.accnum == 'ExtraCardsAccount'){
    	//Надо заново получить всё.
    	var cardId = getParam(info.card, /<td[^>]+class="tdId"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    	var form = getParam(html, /<form[^>]+id="[^"]*:ClientCardsDataForm"[^>]*>[\s\S]*?<\/form>/i);
    	var action = getParam(form, /<form[^>]+action="([^"#]*)/i, replaceHtmlEntities);
		var params = createFormParams(form, function(params, str, name, value) {
			if (/acctIdSelField/i.test(name) || name == 'accountNumber') 
				return info.accnum;
			else if (/cardIdSelField/i.test(name))
				return cardId;
			return value;
		});
		params['accountNumber'] = info.accnum;

		var pname = getParam(info.account, /oam.submitForm\('([^']*)/, replaceSlashes);
		var pval = getParam(info.account, /oam.submitForm\('[^']*','([^']*)/, replaceSlashes);
		params[pname + ':_idcl'] = pval;

		html = AnyBalance.requestPost(baseurl + action, params, addHeaders({'Referer': baseurl}));
		info = findAccount(html);
		if(!info) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось найти информацию по доп. карте! Сайт изменен?');
		}
    }
	
    var result = {success: true};

	if(info.cardnum){
    	getParam(info.cardnum, result, 'cardnum');
	    getParam(info.cardnum, result, '__tariff');
    }else{
    	getParam(info.card, result, 'cardnum', /<td[^>]*class="tdNumber">([^]*?)<\/td>/, replaceTagsAndSpaces);
		getParam(info.card, result, '__tariff', /<td[^>]*class="tdNumber">([^]*?)<\/td>/, replaceTagsAndSpaces);
	}

    getParam(info.card, result, 'cardaccnum', /<td[^>]+class="tdId"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(info.account, result, 'cardname', /<td[^>]*class="tdAccountText">([^]*?)<\/td>/, replaceTagsAndSpaces);
	if(info.accnum == 'ExtraCardsAccount'){
    	getParam(info.card, result, 'balance', /\(<nobr[^>]*>[^<]*<\/nobr>\s+\w+\)/i, replaceTagsAndSpaces, parseBalance);
    	getParam(info.card, result, ['currency', 'balance'], /\(<nobr[^>]*>([^<]*<\/nobr>\s+\w+)\)/i, [replaceTagsAndSpaces, /на дату.*/i, ''], parseCurrency);
    }else{
    	getParam(info.account, result, 'balance', /<td[^>]*class="tdBalance">([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
    	getParam(info.account, result, ['currency', 'balance'], /<td[^>]*class="tdBalance">([\s\S]*?)<\/td>/, [replaceTagsAndSpaces, /на дату.*/i, ''], parseCurrency);
    	getParam(info.accnum, result, 'accnum');
    }
	getParam(addinfo.fio, result, 'fio', null, null, capitalFirstLetters);
	getParam(addinfo.messages, result, 'messages', null, null, parseBalance);
	getParam(addinfo.events, result, 'events', null, null, parseBalance);
    
    AnyBalance.setResult(result);
}

function fetchDeposit(baseurl, html, addinfo){
    var prefs = AnyBalance.getPreferences();

    if(prefs.lastdigits && !/^\d{4,}$/.test(prefs.lastdigits))
        throw new AnyBalance.Error("Надо указывать не менее 4 последних цифр депозита или не указывать ничего");
	
	var href = getParam(html, /href="\/([^"]+)"(?:[^>]*>){1,2}\s*Депозиты \(вклады\)/i, replaceTagsAndSpaces);
	checkEmpty(href, 'Не удалось найти ссылку на депозиты, сайт изменен?', true);
	html = AnyBalance.requestGet(baseurl + href, addHeaders({'Referer': baseurl}));

    var info = findDeposit(html);

    if(!info)
        throw new AnyBalance.Error(prefs.lastdigits ? "Не найден депозит с последними цифрами " + prefs.lastdigits : "Не найдено ни одного депозита");
	
	var result = {success: true};
	
	if(info.accnum){
    	getParam(info.accnum, result, 'cardnum');
	    getParam(info.accnum, result, '__tariff');
    }else{
    	getParam(info.account, result, 'cardnum', /<td[^>]*class="tdNoPadding"[\s\S]*?(?:[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		getParam(info.account, result, '__tariff', /<td[^>]*class="tdNoPadding"[\s\S]*?(?:[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	}
	
	getParam(info.account, result, 'cardnum', /<td[^>]*class="tdNoPadding"[\s\S]*?(?:[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(info.account, result, 'cardname', /<td[^>]*class="tdNoPadding"[\s\S]*?cellLable(?:[^>]*>){9}([\s\S]*?)<\/td>/, replaceTagsAndSpaces);
	getParam(info.account, result, 'balance', /<td[^>]*class="tdNoPadding"[\s\S]*?cellLable(?:[^>]*>){14}([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
    getParam(info.account, result, ['currency', 'balance'], /<td[^>]*class="tdNoPadding"[\s\S]*?cellLable(?:[^>]*>){19}([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseCurrency);
	if(!result.currency)
		result.currency = getParam(info.account, null, null, /<td[^>]*class="tdNoPadding"[\s\S]*?cellLable(?:[^>]*>){19}([\s\S]*?)<\/td>/, replaceTagsAndSpaces)||'';
	getParam(info.account, result, 'status', /<td[^>]*class="tdNoPadding"[\s\S]*?cellLable(?:[^>]*>){23}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(addinfo.fio, result, 'fio', null, null, capitalFirstLetters);
	getParam(addinfo.messages, result, 'messages', null, null, parseBalance);
	getParam(addinfo.events, result, 'events', null, null, parseBalance);
	
	AnyBalance.setResult(result);
}
