/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт и кредитов Московского Кредитного Банка, используя систему Интернет-Банк.

Сайт оператора: http://mkb.ru/
Личный кабинет: https://online.mkb.ru
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
	var baseurl = 'https://online.mkb.ru';
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
	error = getParam(html, null, null, /<span[^>]*id="lblErrorMsg"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
	if(error)
		throw new AnyBalance.Error(error);
		
	var logout = getParam(html, null, null, /(\/secure\/logout.aspx)/i);
	if(!logout)
		throw new AnyBalance.Error('Не удалось зайти в интернет банк. Неправильный логин-пароль или проблемы на сайте.');
		
	if(prefs.type == 'card')
		fetchCard(html, baseurl);
	else if(prefs.type == 'crd')
		fetchCredit(html, baseurl);
	else if(prefs.type == 'dep')
		fetchDeposit(html, baseurl);
	else if(prefs.type == 'acc')
		fetchAccount(html, baseurl);
	else
		fetchCard(html, baseurl);
}

function fetchCard(html, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.num && !/^\d{4}$/.test(prefs.num))
        throw new AnyBalance.Error('Укажите 4 последних цифры карты или не указывайте ничего, чтобы получить информацию по первой карте.');

	var cardnum = prefs.num ? prefs.num : '\\d{4}';
	//                   (<tr[^>]*btnrscards[^>]*><td>[^>]*id=\"hl\"[^>]*6956"[\s\S]*?</tr>)
	var re = new RegExp('(<tr[^>]*btnrscards[^>]*><td>[^>]*id=\"hl\"[^>]*' + cardnum + '\"[\\s\\S]*?</tr>)', 'i');
	var tr = getParam(html, null, null, re);
	if(!tr)
		throw new AnyBalance.Error(prefs.num ? 'Не удалось найти карту с последними цифрами ' + prefs.num : 'Не удалось найти ни одной карты!');
	
    var result = {success: true};
    
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

function fetchCredit(html, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.num && !/^[\d\/\\]{2,}$/.test(prefs.num))
        throw new AnyBalance.Error('Укажите первые цифры (не менее 2) номера кредитного договора или не указывайте ничего, чтобы получить информацию по первому кредитному договору.');

	var cardnum = prefs.num ? prefs.num : '\\d{2,}';
	//                   (<tr[^>]*btnrsloans[^>]*><td>[^>]*id=\"hl\"[^>]*id=               [\\s\\S]*?</tr>)
	var re = new RegExp('(<tr[^>]*btnrsloans[^>]*><td>[^>]*id=\"hl\"[^>]*id=' + cardnum + '[\\s\\S]*?</tr>)', 'i');
	var tr = getParam(html, null, null, re);
	if(!tr)
		throw new AnyBalance.Error(prefs.num ? 'Не удалось найти кредитный договор с первыми цифрами ' + prefs.num : 'Не удалось найти ни одного кредита!');	

    var result = {success: true};
	getParam(tr, result, 'cardnum', /\?id=([^&]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'type', /<td>[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /<td>[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'balance', /class="money"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, ['currency' , '__tariff'], /class="money"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseCurrency);

    var href = getParam(tr, null, null, /href="([^"]*)/i);
    if(!href)
        AnyBalance.trace('Не удалось обнаружить ссылку на подробную информацию по кредиту');
    
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

function fetchAccount(html, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.num && !/^\d{4}$/.test(prefs.num))
        throw new AnyBalance.Error('Укажите 4 последних цифры счета или не указывайте ничего, чтобы получить информацию по первому счету.');
	//                                     Это нужно чтобы отображать Служебный счет, у которого нет номера
	var cardnum = prefs.num ? prefs.num : '[^>]*';
	var re = new RegExp('(<tr[^>]*btnrsaccs[^>]*><td>[^>]*id=\"hl\"[^>]*' + cardnum + '[\\s\\S]*?</tr>)', 'i');
	var tr = getParam(html, null, null, re);
	if(!tr)
		throw new AnyBalance.Error(prefs.num ? 'Не удалось найти счет с последними цифрами ' + prefs.num : 'Не удалось найти ни одного счета!');	

    var result = {success: true};
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

function fetchDeposit(html, baseurl){
    var prefs = AnyBalance.getPreferences();
	html = AnyBalance.requestGet(baseurl + '/secure/deps.aspx');
	
	var json = getParam(html, null, null, /var\s*depdata\s*=\s*\[([\s\S]*?)\]/i, null, getJson);
	if(!json) {
		var err = getParam(html, null, null, /<\/h1><b>([\s\S]*?)<\/b/i, replaceTagsAndSpaces, html_entity_decode);
		throw new AnyBalance.Error(err ? err : 'Сайт вернул не верные данные, возможно проблемы на сайте!');
	}
	
	//var json = getJson(tJson);
	
    var result = {success: true};
    
	getParam(json.ac, result, 'accnum', null, replaceTagsAndSpaces, html_entity_decode);
	getParam(json.nm, result, 'cardnum', null, replaceTagsAndSpaces, html_entity_decode);
	getParam(json.db, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.dr, result, 'pctcredit', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.de, result, 'deptill', null, replaceTagsAndSpaces, parseDateMoment);
	
    AnyBalance.setResult(result);
}

// Парсит дату из такого вида в мс 27 июля 2013
function parseDateMoment(str){
	
	var found = /(\d{1,2})\s*([\s\S]*?)\s*(\d{1,4})/i.exec(str);
	if(found)
	{
		var day = found[1];
		var month = found[2];
		var year = found[3];

		if(month == 'января')
			month = '01';
		else if(month == 'февраля')
			month = '02';
		else if(month == 'марта')
			month = '03';
		else if(month == 'апреля')
			month = '04';
		else if(month == 'мая')
			month = '05';
		else if(month == 'июня')
			month = '06';
		else if(month == 'июля')
			month = '07';
		else if(month == 'августа')
			month = '08';
		else if(month == 'сентября')
			month = '09';
		else if(month == 'октября')
			month = '10';
		else if(month == 'ноября')
			month = '11';
		else if(month == 'декабря')
			month = '12';

		return getParam(day+'.'+month+'.'+ year, null, null, null, replaceTagsAndSpaces, parseDate);
	}
	else
		AnyBalance.trace('Failed to parse date from ' + str);
}