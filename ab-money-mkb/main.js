/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function getEventValidation(html){
    return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/);
}

function getViewState1(html){
    return getParam(html, null, null, /__VIEWSTATE\|([^\|]*)/i);
}

function getEventValidation1(html){
    return getParam(html, null, null, /__EVENTVALIDATION\|([^\|]*)/i);
}

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://oldonline.mkb.ru';
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl + '/secure/login.aspx?newsession=1');
	var eventvalidation = getEventValidation(html);
	var viewstate = getViewState(html);
	html = AnyBalance.requestPost(baseurl + '/secure/login.aspx?newsession=1', {
		__EVENTTARGET:'',
		__EVENTARGUMENT:'',
		__VIEWSTATE:viewstate,
		__EVENTVALIDATION:eventvalidation,
		txtLogin:prefs.login,
		txtPassword:prefs.password,
		btnLoginStandard:'Войти'
	});
	
	if (!/\/secure\/logout\.aspx/i.test(html)) {
		var error = getParam(html, null, null, /<span[^>]*id="lblErrorMsg"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в интернет банк. Неправильный логин-пароль или проблемы на сайте.');
	}
	
	var result = {success: true};
	// Бонусы всегда нужны
	getParam(html, result, 'bonuses', /МКБ Бонус(?:[^>]*>){3}([\d\s.,\-]+)/i, replaceTagsAndSpaces, parseBalance);

	if(prefs.type == 'card')
		fetchCard(html, baseurl, result);
	else if(prefs.type == 'crd')
		fetchCredit(html, baseurl, result);
	else if(prefs.type == 'dep')
		fetchDeposit(html, baseurl, result);
	else if(prefs.type == 'acc')
		fetchAccount(html, baseurl, result);
	else
		fetchCard(html, baseurl, result);
}

function fetchCard(html, baseurl, result) {
    var prefs = AnyBalance.getPreferences();
    if(prefs.num && !/^\d{4}$/.test(prefs.num))
        throw new AnyBalance.Error('Укажите 4 последних цифры карты или не указывайте ничего, чтобы получить информацию по первой карте.');
	
	var cardnum = prefs.num ? prefs.num : '\\d{4}';
	//                   (<tr[^>]*btnrscards[^>]*>\s*<td>[^>]*id=\"hl\"[^>]*6956"[\s\S]*?</tr>)
	var re = new RegExp('(<tr[^>]*btnrscards[^>]*>\\s*<td>[^>]*id=\"hl\"[^>]*' + cardnum + '\"[\\s\\S]*?</tr>)', 'i');
	var tr = getParam(html, null, null, re);
	if(!tr)
		throw new AnyBalance.Error(prefs.num ? 'Не удалось найти карту с последними цифрами ' + prefs.num : 'Не удалось найти ни одной карты!');
	
    getParam(tr, result, 'cardnum', /<td>[^>]*title="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'type', /<td>[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /<td>[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'balance', /class="money"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, ['currency' , '__tariff'], /class="money"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseCurrency);

    var href = getParam(tr, null, null, /href="([^"]*)/i);
    if(!href)
        AnyBalance.trace('Не удалось обнаружить ссылку на подробную информацию по карте');
    
    if(AnyBalance.isAvailable('accnum', 'needpay', 'needpaytill', 'grace', 'gracetill', 'pct', 'credit', 'limit') && href){
        html = AnyBalance.requestGet(baseurl + href);
        getParam(html, result, 'accnum', /Номер счета:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'needpay', /Обязательный платеж\.[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'needpaytill', /Обязательный платеж\.[^<]*\s+по\s+([^<]*)/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'gracepay', /Отчетная задолженность\.[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'gracepaytill', /Отчетная задолженность\.[^<]*\s+по\s+([^<]*)/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'pct', /Срочные проценты[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'credit', /Срочный Кредит[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'limit', /Установленный лимит задолженности[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    }
    
    AnyBalance.setResult(result);
}

function fetchCredit(html, baseurl, result) {
    var prefs = AnyBalance.getPreferences();
    if(prefs.num && !/^[\d\/\\]{2,}$/.test(prefs.num))
        throw new AnyBalance.Error('Укажите первые цифры (не менее 2) номера кредитного договора или не указывайте ничего, чтобы получить информацию по первому кредитному договору.');

	var cardnum = prefs.num ? prefs.num : '\\d{2,}';
	//                   (<tr[^>]*btnrsloans[^>]*><td>[^>]*id=\"hl\"[^>]*id=               [\\s\\S]*?</tr>)
	var re = new RegExp('(<tr[^>]*btnrsloans[^>]*>\\s*<td>[^>]*id=\"hl\"[^>]*id=' + cardnum + '[\\s\\S]*?</tr>)', 'i');
	var tr = getParam(html, null, null, re);
	if(!tr)
		throw new AnyBalance.Error(prefs.num ? 'Не удалось найти кредитный договор с первыми цифрами ' + prefs.num : 'Не удалось найти ни одного кредита!');	

	getParam(tr, result, 'cardnum', /\?id=([^&]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'type', /<td>[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /<td>[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'balance', /class="money"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, ['currency' , '__tariff'], /class="money"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseCurrency);

    var href = getParam(tr, null, null, /href="([^"]*)/i);
    if(!href)
        AnyBalance.trace('Не удалось обнаружить ссылку на подробную информацию по кредиту!');
    
    if(AnyBalance.isAvailable('accnum', 'needpay', 'needpaytill', 'pctcredit', 'limit', 'latedebt')){
        html = AnyBalance.requestGet(baseurl + href);

        var tr = getParam(html, null, null, /<tr[^>]*>(?:[\s\S](?!<\/tr>))*?<input[^>]+name="rbgLoans"[^>]*checked="checked"[\s\S]*?<\/tr>/i);
        if(!tr)
            AnyBalance.trace('Не удалось найти строку с подробной информацией по кредиту');
        
        getParam(tr, result, 'needpaytill', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);

        var idx;
        if(tr){
            idx = getParam(tr, null, null, /data-index="(\d+)/i, null, parseInt);
            if(!isset(idx))
                AnyBalance.trace('Не удалось найти индекс информации по кредиту');
        }

        var json = getParam(html, null, null, /var\s+loanDetailsData\s*=\s*(\[[\s\S]*?\])\s*(?:;|\r?\n\s*var)/, null, getJson);
        if(!json)
            AnyBalance.trace('Не удалось найти json-информацию по кредиту');

        if(!json || !json[idx] || !json[idx].dt){
            AnyBalance.trace('Не удалось найти в json информацию по кредиту');
        }else{
            var info = json[idx].dt;
            getParam(info, result, 'accnum', /Лицевой счет №:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, html_entity_decode);
            getParam(info, result, 'needpay', /Сумма ближайшего платежа:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
            getParam(info, result, 'pctcredit', /Текущая процентная ставка по кредиту:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
            getParam(info, result, 'limit', /Общая сумма кредита:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
            getParam(info, result, 'latedebt', /Просроченная задолженность по кредиту:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance);
        }
    }
    
    AnyBalance.setResult(result);
}

function fetchAccount(html, baseurl, result) {
    var prefs = AnyBalance.getPreferences();
    if(prefs.num && !/^\d{4}$/.test(prefs.num))
        throw new AnyBalance.Error('Укажите 4 последних цифры счета или не указывайте ничего, чтобы получить информацию по первому счету.');
	//                                     Это нужно чтобы отображать Служебный счет, у которого нет номера
	var cardnum = prefs.num ? prefs.num : '[^>]*';
	var re = new RegExp('(<tr[^>]*btnrsaccs[^>]*>\\s*<td>[^>]*id=\"hl\"[^>]*' + cardnum + '[\\s\\S]*?</tr>)', 'i');
	var tr = getParam(html, null, null, re);
	if(!tr)
		throw new AnyBalance.Error(prefs.num ? 'Не удалось найти счет с последними цифрами ' + prefs.num : 'Не удалось найти ни одного счета!');	

	getParam(tr, result, 'cardnum', /\?id=([^&]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'type', /<td>[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /<td>[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'balance', /class="money"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, ['currency' , '__tariff'], /class="money"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseCurrency);

	// Не понятно, надо ли это?
    /*var href = $card.find('td:first-child a').attr('href');
    if(!href)
        AnyBalance.trace('Не удалось обнаружить ссылку на подробную информацию по карте');
    
    if(AnyBalance.isAvailable('accnum', 'needpay', 'needpaytill', 'grace', 'gracetill', 'pct', 'credit', 'limit') && href){
        html = AnyBalance.requestGet(baseurl + href);
        getParam(html, result, 'accnum', /Номер счета:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
        getParam(html, result, 'needpay', /Обязательный платеж\.[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'needpaytill', /Обязательный платеж\.[^<]*\s+по\s+([^<]*)/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'gracepay', /Отчетная задолженность\.[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'gracepaytill', /Отчетная задолженность\.[^<]*\s+по\s+([^<]*)/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'pct', /Срочные проценты[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'credit', /Срочный Кредит[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'limit', /Установленный лимит задолженности[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    }*/
    
    AnyBalance.setResult(result);
}

function fetchDeposit(html, baseurl, result) {
    var prefs = AnyBalance.getPreferences();
	html = AnyBalance.requestGet(baseurl + '/secure/deps.aspx');
	
	var tjson = getParam(html, null, null, /var\s*depdata\s*=\s*([\s\S]*?\}\])/i);
	if(!tjson) {
		var err = getParam(html, null, null, /<\/h1><b>([\s\S]*?)<\/b/i, replaceTagsAndSpaces, html_entity_decode);
		throw new AnyBalance.Error(err ? err : 'У Вас нет вкладов в Московском Кредитном Банке, либо сайт изменен!');
	}
	var json = getJson(tjson);

	// Ищем счета в массиве
	for(var i = 0; i < json.length; i++) {
		var acc = json[i].ac;
		if(new RegExp('\\d+' + (prefs.num || '') + '$').test(acc)) {
			// Нашли нужный счет
			json = json[i];
			break;
		} else {
			AnyBalance.trace('Счет ' + acc + ' не оканчивается на цифры ' + prefs.num);
		}
	}
	if(!json.ac)
		throw new AnyBalance.Error(prefs.num ? 'Не удалось найти депозит с последними цифрами счета ' + prefs.num : 'Не удалось найти ни одного депозита!');	

	getParam(json.ac, result, 'accnum', null, replaceTagsAndSpaces, html_entity_decode);
	getParam(json.nm, result, 'cardnum', null, replaceTagsAndSpaces, html_entity_decode);
	getParam(json.db, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.dr, result, 'pctcredit', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.de, result, 'deptill', null, replaceTagsAndSpaces, parseDateWord);
	
    AnyBalance.setResult(result);
}