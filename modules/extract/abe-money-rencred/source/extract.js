/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_rootrul = "https://ib.rencredit.ru";
var g_baseurl = g_rootrul + "/rencredit/ru/";

var g_headers = {
    'Accept-Language': 'ru, en',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1',
    'Referer': g_baseurl
}

var g_url = {}; //ссылки на доп инфу

function login(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');
	
    var html = AnyBalance.requestGet(g_baseurl + 'group/ibs/product-list', g_headers);
    if(!/<a[^]+id="logout"/i.test(html)){
        html = AnyBalance.requestPost(g_baseurl + 'home?p_p_id=ClientLogin_WAR_bscbankserverportalapp&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=SEND_FORM&p_p_cacheability=cacheLevelPage&p_p_col_id=column-1&p_p_col_count=1', {
            login:prefs.login,
            password:prefs.password,
        }, addHeaders({'X-Requested-With':'XMLHttpRequest'}));
    }else{
    	AnyBalance.trace('Сессия уже начата. Используем существующую сессию');
    }
	
	if(!/<a[^]+id="logout"/i.test(html)){
		if(/<form[^>]+id="_ClientLogin_WAR_bscbankserverportalapp_otpForm"/.test(html)){
			//Надо вводить код подтверждения...
			var message = getParam(html, null, null, /<div[^>]+class="disclaimer"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
			var action = getParam(html, null, null, /<form[^>]+id="_ClientLogin_WAR_bscbankserverportalapp_otpForm"[^>]*action="([^"]*)/i, replaceHtmlEntities);
			if(!action){
				AnyBalance.trace(html);
				throw new AnyBalanc.Error('Не удаётся найти параметр входа (action)! Сайт изменен?');
			}
			var code = AnyBalance.retrieveCode(message || 'Введите СМС-подтверждение для входа в интернет-банк', null, {inputType: 'number', time: 300000});
			html = AnyBalance.requestPost(action, {otp: code}, addHeaders({'X-Requested-With':'XMLHttpRequest'}));
			var redirect = getParam(html, null, null, /\.location\s*=\s*"([^"]*)/, replaceSlashes);
			if(redirect)
				html = AnyBalance.requestGet(redirect.replace(/^\//, g_rootrul + "/"), g_headers);
		}
	}
		
	if(!/<a[^]+id="logout"/i.test(html)){
        //var htmlErr = AnyBalance.requestGet(baseurl + 'faces/renk/login.jsp', g_headers);
        var error = getParam(html, null, null, /msg-error"(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в интернет-банк. Сайт изменен?');
    }

    __setLoginSuccessful();

    initDetailsUrls(html);

    return html;

    //А кредиты так получать
    //https://ib.rencredit.ru/rencredit/ru/group/ibs/product-list?p_p_id=LoansList_WAR_bscbankserverportalapp&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=COMMAND_UPDATE_LOANS&p_p_cacheability=cacheLevelPage&p_p_col_id=column-2-bottom&p_p_col_pos=3&p_p_col_count=4

}

function initDetailsUrls(html){
    g_url.detailsCard = getParam(html, null, null, /"([^"]*card-detail\?[^"]*\{\{id\}\}[^"]*)/, replaceHtmlEntities);
    g_url.detailsDep = getParam(html, null, null, /"([^"]*deposit-details\?[^"]*\{\{id\}\}[^"]*)/, replaceHtmlEntities);
    g_url.detailsAcc = getParam(html, null, null, /"([^"]*current-account-details\?[^"]*\{\{id\}\}[^"]*)/, replaceHtmlEntities);
    g_url.detailsLoan = getParam(html, null, null, /"([^"]*loan-detail\?[^"]*\{\{id\}\}[^"]*)/, replaceHtmlEntities);
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

var g_cardsJson;
function fetchCardsJson(){
    if(g_cardsJson)
        return g_cardsJson;

    g_cardsJson = fetchUrl(g_baseurl + 'group/ibs/product-list?p_p_id=MyCards_WAR_bscbankserverportalapp&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=update&p_p_cacheability=cacheLevelPage&p_p_col_id=column-2-bottom&p_p_col_pos=1&p_p_col_count=4', 'карты');
    return g_cardsJson;
}

function processCards(html, result) {
    if (!AnyBalance.isAvailable('cards'))
        return;

    var json = fetchCardsJson();
    result.cards = [];
    for (var i = 0; i < json.cards.length; ++i) {
        var card = json.cards[i];
        if (card.typeCode == 'LOY')
            continue;

        var c = {
            __id: card.id,
            __name: card.type + ', ' + card.number,
            num: card.number
        }

        if (__shouldProcess('cards', c)) {
            processCard(card, c);
        }

        result.cards.push(c);
    }
}

function processBonus(html, result) {
    if (!AnyBalance.isAvailable('bonus'))
        return;

    var json = fetchCardsJson();
    for (var i = 0; i < json.cards.length; ++i) {
        var card = json.cards[i];
        if (card.typeCode == 'LOY'){
            getParam(card.availableBalance, result, 'bonus');
        }
    }
}

function processCard(card, result){
    //Доступный лимит
	getParam(card.availableBalance, result, 'cards.balance');
	//Валюта
	getParam(card.currency, result, ['cards.currency', 'cards.balance', 'cards.minpay', 'cards.limit', 'cards.own', 'cards.blocked', 'cards.cash']);
    //Тип
    getParam(card.type, result, 'cards.type');
    getParam(card.typeCode, result, 'cards.type_code'); //DBTO
    //Статус
    getParam(card.status, result, 'cards.status');
    getParam(card.statusCode, result, 'cards.status_code'); //ACTIVE
    getParam(card.closed, result, 'cards.closed');

    if(g_url.detailsCard && AnyBalance.isAvailable('cards.minpay', 'cards.minpaytill', 'cards.limit', 'cards.userName', 'cards.own', 'cards.accnum', 'cards.contract', 'cards.cash', 'cards.blocked', 'cards.type_product')){
    	var html = AnyBalance.requestGet(g_url.detailsCard.replace('{{id}}', card.id), g_headers);
    	getParam(html, result, 'cards.minpay', /<div[^>]+class="cell[^>]*>Сумма минимального платежа[\s\S]*?<div[^>]+class="cell[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    	getParam(html, result, 'cards.limit', /<div[^>]+class="cell[^>]*>Общий размер кредитного лимита[\s\S]*?<div[^>]+class="cell[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    	getParam(html, result, 'cards.own', /<div[^>]+class="cell[^>]*>Собственные средства[\s\S]*?<div[^>]+class="cell[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'cards.cash', /<div[^>]+class="cell[^>]*>Доступные средства для снятия наличных[\s\S]*?<div[^>]+class="cell[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'cards.blocked', /<div[^>]+class="cell[^>]*>Сумма неподтвержденных операций[\s\S]*?<div[^>]+class="cell[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    	getParam(html, result, 'cards.minpaytill', /<div[^>]+class="cell[^>]*>Погасить минимальный платеж до[\s\S]*?<div[^>]+class="cell[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
    	getParam(html, result, 'cards.userName', /<span[^>]+class="[^>]*fio[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
    	getParam(html, result, 'cards.accnum', /<div[^>]+class="cell[^>]*>Номер счета[\s\S]*?<div[^>]+class="cell[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    	getParam(html, result, 'cards.contract', /<div[^>]+class="cell[^>]*>Номер договора[\s\S]*?<div[^>]+class="cell[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        getParam(html, result, 'cards.type_product', /<div[^>]+class="cell[^>]*>Тип продукта[\s\S]*?<div[^>]+class="cell[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    }

    if(AnyBalance.isAvailable('cards.transactions')){
    	processCardsTransactions(card, result);
    }

    
}

function processInfo(html, result){
    var info = result.info = {};
    getParam(html, info, 'info.fio', /<span[^>]+fio[^>]*>([^]*?)<\/span>/i, replaceTagsAndSpaces);

    if(AnyBalance.isAvailable('info.name_last', 'info.name', 'info.name_patronymic', 'info.hphone', 'info.mphone', 'info.wphone', 'info.email')) {
        html = AnyBalance.requestGet(g_baseurl + 'group/ibs/settings', g_headers);

        getParam(html, info, 'info.name_last', />\s*Фамилия[^]*?<td[^>]*>([^]*?)<\/td>/i, replaceTagsAndSpaces);
        getParam(html, info, 'info.name', />\s*Имя[^]*?<td[^>]*>([^]*?)<\/td>/i, replaceTagsAndSpaces);
        getParam(html, info, 'info.name_patronymic', />\s*Отчество[^]*?<td[^>]*>([^]*?)<\/td>/i, replaceTagsAndSpaces);
        getParam(html, info, 'info.hphone', /<td[^>]*>\s*Домашний[^]*?<td[^>]*>([^]*?)<\/td>/i, replaceTagsAndSpaces); //+7000*****00
        getParam(html, info, 'info.mphone', /<td[^>]*>\s*Мобильный[^]*?<td[^>]*>([^]*?)<\/td>/i, replaceTagsAndSpaces); //+7905*****42
        getParam(html, info, 'info.wphone', /<td[^>]*>\s*Рабочий[^]*?<td[^>]*>([^]*?)<\/td>/i, replaceTagsAndSpaces); //+7861*****25
        getParam(html, info, 'info.email', /<td[^>]*>\s*Email[^]*?<td[^>]*>([^]*?)<\/td>/i, replaceTagsAndSpaces); //K*********@MAIL.RU
    }
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
