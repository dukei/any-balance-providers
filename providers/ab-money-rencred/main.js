/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept-Language': 'ru, en',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1',
    'Referer': 'https://ib.rencredit.ru/rencredit/ru/'
}

var g_detailsUrl, g_detailsUrlDep, g_detailsAcc, g_detailsLoan;

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');
	
	var baseurl = "https://ib.rencredit.ru/rencredit/ru/";
    
    var html = AnyBalance.requestGet(baseurl, g_headers);
	
    html = AnyBalance.requestPost(baseurl + 'home?p_p_id=ClientLogin_WAR_bscbankserverportalapp&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=SEND_FORM&p_p_cacheability=cacheLevelPage&p_p_col_id=column-1&p_p_col_count=1', {
        login:prefs.login,
        password:prefs.password,
    }, addHeaders({'X-Requested-With':'XMLHttpRequest'}));
	
	if(!/<a[^]+id="logout"/i.test(html)){
		if(/<form[^>]+id="_ClientLogin_WAR_bscbankserverportalapp_otpForm"/.test(html)){
			//Надо вводить код подтверждения...
			var message = getParam(html, null, null, /<div[^>]+class="disclaimer"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
			var action = getParam(html, null, null, /<form[^>]+id="_ClientLogin_WAR_bscbankserverportalapp_otpForm"[^>]*action="([^"]*)/i, null, html_entity_decode);
			if(!action){
				AnyBalance.trace(html);
				throw new AnyBalanc.Error('Не удаётся найти параметр входа (action)! Сайт изменен?');
			}
			var code = AnyBalance.retrieveCode(message || 'Введите СМС-подтверждение для входа в интернет-банк', null, {inputType: 'number', time: 300000});
			html = AnyBalance.requestPost(action, {otp: code}, addHeaders({'X-Requested-With':'XMLHttpRequest'}));
			var redirect = getParam(html, null, null, /\.location\s*=\s*"([^"]*)/, replaceSlashes);
			if(redirect)
				html = AnyBalance.requestGet(redirect.replace(/^\//, "https://ib.rencredit.ru/"), g_headers);
		}
	}
		
	if(!/<a[^]+id="logout"/i.test(html)){
        //var htmlErr = AnyBalance.requestGet(baseurl + 'faces/renk/login.jsp', g_headers);
        var error = getParam(html, null, null, /msg-error"(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в интернет-банк. Сайт изменен?');
    }
/*	
	var auth_token = getParam(html, null, null, /Liferay\.authToken\s*=\s*'([^']*)/, replaceSlashes);
	if(!auth_token){
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось найти токен авторизации. Сайт изменен?');
	}
*/	

    g_detailsUrl = getParam(html, null, null, /"([^"]*card-detail\?[^"]*\{\{id\}\}[^"]*)/, null, html_entity_decode);
    g_detailsUrlDep = getParam(html, null, null, /"([^"]*deposit-details\?[^"]*\{\{id\}\}[^"]*)/, null, html_entity_decode);
    g_detailsUrlAcc = getParam(html, null, null, /"([^"]*current-account-details\?[^"]*\{\{id\}\}[^"]*)/, null, html_entity_decode);
    g_detailsUrlLoan = getParam(html, null, null, /"([^"]*loan-detail\?[^"]*\{\{id\}\}[^"]*)/, null, html_entity_decode);
    
    if(!g_detailsUrl){
    	AnyBalance.trace(html);
    	AnyBalance.trace('Не удалось получить ссылку на детали по карте, детали получены не будут');
    }

	if(prefs.type == 'acc' || prefs.type == 'deposit')
        fetchAccount(html, baseurl);
    else
        fetchCard(html, baseurl); //По умолчанию карты будем получать

    //А кредиты так получать
    //https://ib.rencredit.ru/rencredit/ru/group/ibs/product-list?p_p_id=LoansList_WAR_bscbankserverportalapp&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=COMMAND_UPDATE_LOANS&p_p_cacheability=cacheLevelPage&p_p_col_id=column-2-bottom&p_p_col_pos=3&p_p_col_count=4

}

function fetchUrl(url, what){
    var tries = 0;

    do{
    	if(tries)
    		AnyBalance.sleep(1500);
        AnyBalance.trace('Попытка получить ' + what + ' №' + (tries+1));
        var html = AnyBalance.requestGet(url, addHeaders({'X-Requested-With':'XMLHttpRequest'}));
        var json = getJson(html);
    }while(!json.failed && !json.suspendPolling && tries++ < 10);

    if(json.failed){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось получить ' + what + ', проблемы на сайте или сайт изменен.');
    }
    	
    if(!json.suspendPolling){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удаётся долго получить ' + what + '. Возможно, проблемы на сайте, попробуйте ещё раз позднее.');
    }

    return json;	
}

function fetchCard(html, baseurl) {
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
        throw new AnyBalance.Error('Пожалуйста, введите 4 последних цифры номера карты, по которой вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первой карте.');

    var json = fetchUrl(baseurl + 'group/ibs/product-list?p_p_id=MyCards_WAR_bscbankserverportalapp&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=update&p_p_cacheability=cacheLevelPage&p_p_col_id=column-2-bottom&p_p_col_pos=1&p_p_col_count=4', 'карты');
    var card = null;
    for(var i=0; i<json.cards.length; ++i){
    	var c= json.cards[i];
    	if(!prefs.cardnum || endsWith(c.number, prefs.cardnum)){
    		card = c;
    		break;
    	}
    }

    if(!card)
    	throw new AnyBalance.Error(prefs.cardnum ? 'Не удалось найти карту с последними цифрами ' + prefs.cardnum : 'Не удалось найти ни одной карты');

    var result = {success: true};

    //Номер карты
    getParam(card.number, result, 'cardnum');
    //Номер карты
    getParam(card.number, result, '__tariff');
    //Доступный лимит
	getParam(card.availableBalance, result, 'balance', null, null, parseBalance);
	//Валюта
	getParam(card.currency, result, ['currency', 'balance', 'minpay', 'limit']);
    //Тип
    getParam(card.type, result, 'accname');
    //Статус
    getParam(card.status, result, 'status');

    if(g_detailsUrl && AnyBalance.isAvailable('minpay', 'minpaytill', 'limit', 'userName', 'own', 'accnum', 'contract')){
    	var html = AnyBalance.requestGet(g_detailsUrl.replace('{{id}}', card.id), g_headers);
    	getParam(html, result, 'minpay', /<div[^>]+class="cell[^>]*>Сумма минимального платежа[\s\S]*?<div[^>]+class="cell[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    	getParam(html, result, 'limit', /<div[^>]+class="cell[^>]*>Общий размер кредитного лимита[\s\S]*?<div[^>]+class="cell[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    	getParam(html, result, 'own', /<div[^>]+class="cell[^>]*>Собственные средства[\s\S]*?<div[^>]+class="cell[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    	getParam(html, result, 'minpaytill', /<div[^>]+class="cell[^>]*>Погасить минимальный платеж до[\s\S]*?<div[^>]+class="cell[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
    	getParam(html, result, 'userName', /<span[^>]+class="[^>]*fio[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    	getParam(html, result, 'accnum', /<div[^>]+class="cell[^>]*>Номер счета[\s\S]*?<div[^>]+class="cell[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    	getParam(html, result, 'contract', /<div[^>]+class="cell[^>]*>Номер договора[\s\S]*?<div[^>]+class="cell[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    }

    AnyBalance.setResult(result);
}

function fetchAccount(html, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4,20}$/.test(prefs.cardnum))
        throw new AnyBalance.Error('Пожалуйста, введите не менее 4 последних цифр номера счета (или договора), по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому счету.');
	
    var json = fetchUrl(baseurl + 'group/ibs/product-list?p_p_id=DepositsList_WAR_bscbankserverportalapp&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=depositsListupdate&p_p_cacheability=cacheLevelPage&p_p_col_id=column-2-bottom&p_p_col_pos=2&p_p_col_count=4', 'карты');
    var accsAndDeps = [json.accounts, json.deposits];
    var acc = null;

    outer: for(var i=0; i<accsAndDeps.length; ++i){
    	var accs = accsAndDeps[i];
    	if(!accs) continue;
    	for(var j=0; j<accs.length; ++j){
    		if(!prefs.cardnum || endsWith(accs[j].accountNumber, prefs.cardnum)){
    		    acc = accs[j];
    			break outer;
    		}
    	}
    }

    if(!acc)
    	throw new AnyBalance.Error(prefs.cardnum ? 'Не удалось найти счета/депозита с последними цифрами ' + prefs.cardnum : 'Не удалось найти ни одного счета/депозита');
	
    var result = {success: true};
    getParam(acc.currency, result, ['currency', 'balance']);
    getParam(acc.accountNumber, result, 'accnum');
    getParam(acc.contractNumber, result, 'contract');

    if(acc.currentDepositAmount){
    	//Это депозит
        getParam(acc.currentDepositAmount, result, 'balance', null, null, parseBalance);
        getParam(acc.interestRate, result, 'pct');
        getParam(acc.name, result, 'accname');
        getParam(acc.expirationDate, result, 'till', null, null, parseDate);
        getParam(acc.name, result, '__tariff');
    }else{
        //Это счет
        getParam(acc.currentBalance, result, 'balance', null, null, parseBalance);
        getParam(acc.accountNumber, result, '__tariff');
        getParam(acc.status, result, 'status');
    }
	
    AnyBalance.setResult(result);
}
