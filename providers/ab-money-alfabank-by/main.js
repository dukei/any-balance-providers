/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

var baseurl = 'https://click.alfa-bank.by/';
function login(){
}

function isLoggedIn(html){
	return /Выход[^a-я]/i.test(html);
}

function skipButtons(params, str, name, value) {
	if (/^<button/i.test(str)) //Skip buttons
		return;

	return value;
}

function followLink(html, reName){
	var a = getElements(html, [/<a\b/ig, reName])[0];
	if(!a){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти ссылку ' + reName.source);
	}

	var formName = getParam(a, null, null, /addSubmitParam\s*\(\s*'([^']*)/, replaceHtmlEntities);
	var addParams = getJsonObject(a, /addSubmitParam/);

	var form = getElement(html, new RegExp('<form[^>]+name="' + formName + '"', 'i'));
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму перехода по ссылке ' + reName.source);
	}
	var params = createFormParams(form, skipButtons);

	for(var i in addParams)
		params[i] = addParams[i];

	var action = getParam(html, null, null, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);

	html = AnyBalance.requestPost(joinUrl(baseurl, action), params, addHeaders({Referer: baseurl + 'webBank2/body/details.xhtml'}));
	return html;
}

function followAjaxLink(html, reName, linkSearchHtml){
	if(!linkSearchHtml)
		linkSearchHtml = html;

	var a = getElements(linkSearchHtml, [/<a\b/ig, reName])[0];
	if(!a){
		AnyBalance.trace(linkSearchHtml);
		throw new AnyBalance.Error('Не удалось найти ajax ссылку ' + reName.source);
	}

	var ajaxParams = getJsonObject(a, /PrimeFaces.ab\s*\(\s*/);
	var formName = ajaxParams.source.replace(/:[^:]*$/, '');

	var form = getElement(html, new RegExp('<form[^>]+name="' + formName + '"', 'i'));
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму перехода по ссылке ' + reName.source);
	}
	var params = createFormParams(form, skipButtons);
	
	params['javax.faces.partial.ajax'] = 'true';
	params['javax.faces.source'] = ajaxParams.source;
	params['javax.faces.partial.execute'] = '@all';
	params[ajaxParams.source] = ajaxParams.source;

	for(var i=0; ajaxParams.params && i<ajaxParams.params.length; ++i){
		var p = ajaxParams.params[i];
		params[p.name] = p.value;
	}

	var action = getParam(html, null, null, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);

	html = AnyBalance.requestPost(joinUrl(baseurl, action), params, addHeaders({Referer: AnyBalance.getLastUrl()}));
	return html;
}

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'webBank2/body/details.xhtml', addHeaders({Referer: baseurl + 'webBank2/body/details.xhtml'}));
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');

	if(!isLoggedIn(html)){
		var form = getElement(html, /<form[^>]+name="center"/i);
		if(!form){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
		}

		var params = AB.createFormParams(form, function(params, str, name, value) {
			if (name == 'center:login') {
				return prefs.login;
			} else if (name == 'center:keyboard') {
				return prefs.password;
			}
	    
			return value;
		});

		html = AnyBalance.requestPost(baseurl + 'webBank2/login.xhtml', params, addHeaders({Referer: AnyBalance.getLastUrl()}));

		if (!isLoggedIn(html)) {
			var error = getElement(html, /<span[^>]+ui-messages-error-summary/i, replaceTagsAndSpaces);
			if (error)
				throw new AnyBalance.Error(error, null, /парол/i.test(error));
			
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
	}else{
		AnyBalance.trace('Используем активную сессию...');
	}

	AnyBalance.trace('Зашли в банк');
	var result = {success: true};
	
    if(prefs.type == 'dep')
        processDeposits(html, baseurl);
    else if(prefs.type == 'credit')
        processCredits(html, baseurl);
    else if(prefs.type == 'acc')
        processAccounts(html, baseurl, null, result);
    else{ 
        processCards(html, baseurl, result);
        processAccounts(html, baseurl, result.acc_number, result);
    }

    AnyBalance.setResult(result);
}

function processCards(html, baseurl, result){
	var prefs = AnyBalance.getPreferences();

	html = followLink(html, />\s*Мои карты\s*</i);

	var table = getElement(html, /<div[^>]+cardTable/i);
	if(!table){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти таблицу счетов. Сайт изменен?');
	}

	var tbody = getElement(table, /<tbody/i);
	var trs = getElements(tbody, /<tr/ig);
	AnyBalance.trace('Найдено ' + trs.length + ' карт');

	for(var i=0; i<trs.length; ++i){
		var tr = trs[i];
		var tds = getElements(tr, /<td/ig);
		var name = getParam(tds[3], null, null, null, replaceTagsAndSpaces);
		var num = getParam(name, null, null, /\(([^)]*)\)$/i);
		if(!prefs.cardnum || endsWith(num, prefs.cardnum)){
			getParam(num, result, 'card_number');
			getParam(name, result, 'card_type', /[^(]*/i, replaceTagsAndSpaces);
			result.acc_number = getParam(tds[6], null, null, null, replaceTagsAndSpaces);
			getParam(tds[7], result, 'card_curr', null, replaceTagsAndSpaces);
			getParam(tds[9], result, 'status', null, replaceTagsAndSpaces);
			getParam(tds[4], result, 'expires', /\d\d\/\d\d/, replaceTagsAndSpaces);
			break;
		}
	}

	if(i>=trs.length)
		throw new AnyBalance.Error(i ? 'У вас нет ни одной карты' : 'Не найдена карта с последними цифрами ' + prefs.cardnum);

	return html;
}

function processAccounts(html, baseurl, acc_number, result){
	var prefs = AnyBalance.getPreferences();
	if(!acc_number)
		acc_number = prefs.cardnum;

	html = followLink(html, />\s*Мои счета\s*</i);

	var table = getElement(html, /<div[^>]+productsTable/i);
	if(!table){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти таблицу счетов. Сайт изменен?');
	}

	var tbody = getElement(table, /<tbody/i);
	var trs = getElements(tbody, /<tr/ig);
	AnyBalance.trace('Найдено ' + trs.length + ' счетов');

	for(var i=0; i<trs.length; ++i){
		var tr = trs[i];
		var num = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		if(!acc_number || endsWith(num, acc_number)){
			getParam(num, result, 'acc_number');
			getParam(tr, result, 'acc_type', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
			getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
			getParam(tr, result, ['currency', 'balance'], /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

			html = followAjaxLink(html, /accountId/, tr);
			getParam(html, result, 'limit', /Кредитный лимит:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'min_balance', /Неснижаемый остаток:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'rate', /Процентная ставка, текущая:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
			break;
		}
	}

	if(i>=trs.length)
		throw new AnyBalance.Error(i ? 'У вас нет ни одного счета' : 'Не найден счет с последними цифрами ' + acc_number);

	return html;
}

function processDep(html, baseurl){
	throw new AnyBalance.Error('Депозиты пока не поддерживаются, свяжитесь, пожалуйста, с разработчиками.');
}

function processCredit(html, baseurl, _accnum, result){
    throw new AnyBalance.Error('Кредиты пока не поддерживаются, свяжитесь, пожалуйста, с разработчиками.');
}