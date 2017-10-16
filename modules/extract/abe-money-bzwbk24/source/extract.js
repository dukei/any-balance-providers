/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36'
};

var baseurl = 'https://www.centrum24.pl/centrum24-web/';

function login() {
	var prefs = AnyBalance.getPreferences();

	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Wpisz NIK!');
	checkEmpty(prefs.password, 'Wpisz hasło (PIN)!');

	var html = AnyBalance.requestGet(baseurl + 'portfolio', g_headers);
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Error connecting internet-bank! Try again later.');
	}

	if (!/logout/i.test(html)) {
        var form = getElement(html, /<form[^>]+id="nikForm"[^>]*>/i);
		if(!form) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Could not find NIK form. Is site changed?');
		}

        var params = createFormParams(form, function(params, str, name, value) {
            if (name == 'nik')
                return prefs.login;
            return value;
        });
		var action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, AB.replaceHtmlEntities);
		html = AnyBalance.requestPost(joinUrl(baseurl, action), params, addHeaders({Referer: baseurl + 'login'}));

		form = getElement(html, /<form[^>]+id="pinForm"[^>]*>/i);
		if(!form) {
			var error = getElement(html, /<li[^>]+feedbackPanelERROR[^>]*>|<div[^>]+logErrorMessage[^>]*>/i, replaceTagsAndSpaces);
			if(error)
				throw new AnyBalance.Error('NIK: ' + error, null, /incorrect|nieprawid|NIK|PIN/i.test(error));
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Could not find PIN form. Is site changed?');
		}

		params = createFormParams(form, function(params, str, name, value) {
			if (name == 'pinFragment:pin')
				return prefs.password;
			return value;
		});
		action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, AB.replaceHtmlEntities);
		html = AnyBalance.requestPost(joinUrl(baseurl, action), params, addHeaders({Referer: AnyBalance.getLastUrl()}));
	}else{
		AnyBalance.trace('Already logged in. Reusing previous session.')
	}

	if (!/logout/i.test(html)) {
		var error = getElement(html, /<li[^>]+feedbackPanelERROR[^>]*>|<div[^>]+logErrorMessage[^>]*>/i, replaceTagsAndSpaces);
		if(error)
			throw new AnyBalance.Error(error, null, /incorrect|nieprawid|NIK|PIN/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Could not log into internet bank. Is the site changed?');
	}

	if(!/<li[^>]+id="menu_portfel_24"[^>]+class="selected"/i.test(html)){
		AnyBalance.trace('Portfel is not selected. Selecting it explicitly.');
		html = AnyBalance.requestGet(baseurl + 'portfolio', g_headers);
	}

    __setLoginSuccessful();
	
	return html;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка счетов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(html, result) {
    if(!AnyBalance.isAvailable('accounts'))
        return;

	var accounts = getElement(html, /<div[^>]+avistaAccountsBoxContent[^>]*>/i);
	if(!accounts){
		AnyBalance.trace(html);
		AnyBalance.trace('You possibly do not have accounts');
		return;
	}

	var body = getElement(accounts, /<tbody[^>]*>/i);
	accounts = getElements(body, /<tr[^>]*>/ig);

	if(!accounts.length){
        AnyBalance.trace('У вас нет счетов');
        result.accounts = [];
		return;
	}
	
	AnyBalance.trace('Найдено счетов: ' + accounts.length);
	result.accounts = [];
	
	for(var i=0; i < accounts.length; ++i){
        var acc = accounts[i];
		var nameid = getParam(acc, null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i);
		var num = getElement(nameid, /<em[^>]*>/i, replaceTagsAndSpaces);
		var name = getElement(nameid, /<a[^>]*>/i, replaceTagsAndSpaces);

		var c = {__id: num, __name: name + ' ' + num.substr(-4), num: num, name: name};
		
		if(__shouldProcess('accounts', c)) {
			processAccount(acc, c);
		}
		
		result.accounts.push(c);
	}
}

function processAccount(account, result){
    AnyBalance.trace('Обработка счета ' + result.__name);

	getParam(account, result, 'accounts.available', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(account, result, 'accounts.balance', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(account, result, ['accounts.currency', 'accounts.balance', 'accounts.available'], /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);

	if(AnyBalance.isAvailable('accounts.limit', 'accounts.pct', 'accounts.last_transaction_date')) {
		var details_url = getParam(getElements(account, [/<a[^>]+>/ig, /Szczegóły|Details|Detalles/i])[0], null, null, /<a[^>]+href="([^"]*)/i, replaceHtmlEntities);
		var html = AnyBalance.requestGet(baseurl + 'portfolio' + details_url, g_headers);

		getParam(html, result, 'accounts.limit', /(?:Credit limit|Limit kredytowy|Límite de crédito)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'accounts.pct', /(?:Interest rate|Oprocentowanie|Tasa de interés)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'accounts.last_transaction_date', /(?:Last transaction date|Data ostatniej operacji|Fecha de última operación)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDateISO);
	}

    if(AnyBalance.isAvailable('accounts.transactions')) {
        processAccountTransactions(account, result);
    }
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;

	html = AnyBalance.requestGet(baseurl + 'cards', g_headers);
	var accounts = getElement(html, /<div[^>]+debitCardsBoxContent[^>]*>/i);
	if(!accounts){
		AnyBalance.trace(html);
		AnyBalance.trace('You possibly do not have debit cards');
		return;
	}

	var body = getElement(accounts, /<tbody[^>]*>/i);
	accounts = getElements(body, /<tr[^>]*>/ig);

	if(!accounts.length){
		AnyBalance.trace('У вас нет счетов');
		result.accounts = [];
		return;
	}

	AnyBalance.trace('Найдено карт: ' + accounts.length);
	result.cards = [];

	for(var i=0; i < accounts.length; ++i){
		var acc = accounts[i];
		var nameaccnum = getParam(acc, null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i);
		var accnum = getElement(nameaccnum, /<em[^>]*>/i, replaceTagsAndSpaces);
		var name = getElement(nameaccnum, /<a[^>]*>/i, replaceTagsAndSpaces);
		var holdernum = getParam(acc, null, null, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i);
		var num = getParam(holdernum, null, null, /<br[^>]*>([\s\S]*)/i, replaceTagsAndSpaces);

		var c = {__id: num, __name: name + ' ' + num.substr(-4), num: num, name: name, accnum: accnum};

		if(__shouldProcess('cards', c)) {
			processCard(acc, c);
		}

		result.cards.push(c);
	}
}

function processCard(account, result) {
    AnyBalance.trace('Обработка карты ' + result.__name);

	getParam(account, result, ['cards.currency', 'cards.balance', 'cards.available'], /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

	if(AnyBalance.isAvailable('cards.holder', 'cards.status')) {
		var details_url = getParam(getElements(account, [/<a[^>]+>/ig, /Szczegóły|Details|Detalles/i])[0], null, null, /<a[^>]+href="([^"]*)/i, replaceHtmlEntities);
		var html = AnyBalance.requestGet(baseurl + 'portfolio' + details_url, g_headers);

		getParam(html, result, 'cards.holder', /(?:Name and surname|Imię i nazwisko|Nombre y apellido):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		getParam(html, result, 'cards.status', /(?:Status|Estado):[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	}

	if(AnyBalance.isAvailable('cards.transactions')) {
		processCardTransactions(account, result);
	}


}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(html, result) {
	if(!AnyBalance.isAvailable('deposits'))
		return;

}

function processDeposit(html, result, detailsJson) {
    AnyBalance.trace('Обработка депозита ' + result.__name);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCredits(html, result) {
	if(!AnyBalance.isAvailable('credits'))
		return;

}

function processCredit(html, result, detailsJson){
    AnyBalance.trace('Обработка кредита ' + result.__name);

    if(AnyBalance.isAvailable('credits.transactions')) {
        processCreditTransactions(html, result);
    }

    if(AnyBalance.isAvailable('credits.schedule')) {
        processCreditSchedule(html, result);
    }
}

function processInfo(html, result){
    html = AnyBalance.requestGet(baseurl + 'yourData', g_headers);
    var info = result.info = {};

	var select = getElement(html, /<select[^>]+mobilePhoneNumberPanel:phoneNumberPrefix[^>]*>/i);
	var option = getElement(select, /<option[^>]+selected[^>]*>/i, replaceTagsAndSpaces);
	var aggregate_join_concat = create_aggregate_join('');
	sumParam(option, info, 'info.mphone', /\(([^)]*)\)/, null, null, aggregate_join_concat);
	sumParam(html, info, 'info.mphone', /<input[^>]*mobilePhoneNumberPanel:phoneNumber\b[^>]*value="([^"]*)/, replaceTagsAndSpaces, null, aggregate_join_concat);
	getParam(html, info, 'info.email', /<input[^>]*emailMailInpBorder:emailMailInp\b[^>]*value="([^"]*)/, replaceTagsAndSpaces);

    getParam(html, info, 'info.fio', /<span[^>]+label[^>]*>\s*(?:Name|Nazwa|Nombre)[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, info, 'info.address_street', /<span[^>]+label[^>]*>\s*(?:Street|Ulica|Calle)[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, info, 'info.address_zip', /<span[^>]+label[^>]*>\s*(?:Postal code|Kod pocztowy|Código postal)[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, info, 'info.address_city', /<span[^>]+label[^>]*>\s*(?:City|Miejscowość|Localidad)[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);

	getParam(getElement(html, /<select[^>]+countryHomeChoiceBorder:countryHomeChoice[^>]*>/i), info, 'info.address_country', /<option[^>]+selected[^>]*value="([^"]*)/i, replaceHtmlEntities);
	getParam(getElement(html, /<select[^>]+citizenshipChoiceBorder:citizenshipChoice[^>]*>/i), info, 'info.nationality', /<option[^>]+selected[^>]*value="([^"]*)/i, replaceHtmlEntities);
	getParam(getElement(html, /<select[^>]+birthCountryChoiceBorder:birthCountryChoice[^>]*>/i), info, 'info.birth_country', /<option[^>]+selected[^>]*value="([^"]*)/i, replaceHtmlEntities);
}
