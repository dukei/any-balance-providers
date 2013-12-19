/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
для отладки используем debug:'new'
*/

function getViewState(html) {
	return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function getEventValidation(html) {
	return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/);
}

function main() {
	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	var baseurl = 'https://www.telebank.ru/WebNew/';
	var html = AnyBalance.requestGet(baseurl + 'Login.aspx');
	
	if(!prefs.debug) {
		html = AnyBalance.requestPost(baseurl + 'Login.aspx', {
			__EVENTVALIDATION: getEventValidation(html),
			__VIEWSTATE: getViewState(html),
			js: 1,
			m: 1,
			__LASTFOCUS: '',
			__EVENTTARGET: '',
			__EVENTARGUMENT: '',
			Action: '',
			ButtonLogin: '',
			TextBoxName: prefs.login,
			TextBoxPassword: prefs.password
		});
	}	
	/*if(/new\.telebank\.ru/i.test(AnyBalance.getLastUrl()) || prefs.debug == 'new') {
		AnyBalance.trace('Определен новый тип банка, пробуем авторизоваться вновь.');
		
		//https://new.telebank.ru/content/telebank-client/ru/login.html
	} else */{
		AnyBalance.trace('Определен старый тип банка, перходим к получению данных.');
		if (!/location.href\s*=\s*"[^"]*Accounts.aspx/i.test(html)) {
			if (/id="ItemNewPassword"/i.test(html))
				throw new AnyBalance.Error('Телеинфо требует поменять пароль. Пожалуйста, войдите в Телеинфо через браузер, поменяйте пароль, а затем введите новый пароль в настройки провайдера.');
			if (/Проверка переменного кода/i.test(html))
				throw new AnyBalance.Error('Телеинфо требует ввести переменный код. Для использования данного провайдера, проверку кода необходимо отключить.');
			if (/id="LabelError"/i.test(html))
				throw new AnyBalance.Error(getParam(html, null, null, /id="LabelMessage"(?:[^>]*>){3}([^<]*)/i));
				
			throw new AnyBalance.Error('Не удалось зайти в Телеинфо. Сайт изменен?');
		}
		if (prefs.type == 'abs') {
			fetchAccountABS(baseurl);
		} else { //card
			fetchCard(baseurl);
		}		
	}
}

function fetchAccountABS(baseurl) {
	var prefs = AnyBalance.getPreferences();
	var html = AnyBalance.requestGet(baseurl + 'Accounts/Accounts.aspx?_ra=4');
	if (prefs.card && !/^\d{4,20}$/.test(prefs.card)) 
		throw new AnyBalance.Error('Пожалуйста, введите не менее 4 последних цифр номера счета, по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому счету.');
		
	var table = getParam(html, null, null, /<table[^>]+class="[^"]*accounts[^>]*>([\s\S]*?)<\/table>/i);
	if (!table)
		throw new AnyBalance.Error('Не найдена таблица счетов. Сайт изменен?');
	//Сколько цифр осталось, чтобы дополнить до 20
	var accnum = prefs.card || '';
	var accprefix = accnum.length;
	accprefix = 20 - accprefix;
	var result = {success: true};
	
	var re = new RegExp('(<tr[^>]*(?:[\\s\\S](?!</tr))*' + (accprefix > 0 ? '\\d{' + accprefix + '}' : '') + accnum + '\\s*<[\\s\\S]*?</tr>)', 'i');
	var tr = getParam(html, null, null, re);
	if (!tr)
		throw new AnyBalance.Error('Не удаётся найти ' + (prefs.card ? 'счет с ID ' + prefs.card : 'ни одного счета'));
		
	getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(tr, result, 'cardnum', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, ['currency', 'balance'], /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, 'cardname', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', /<div[^>]+id="name"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}

function fetchCard(baseurl) {
	var prefs = AnyBalance.getPreferences();
	var html = AnyBalance.requestGet(baseurl + 'Accounts/Accounts.aspx');
	var result = {success: true};
	
	var accounts = getParam(html, null, null, /<table[^>]+class="accounts[\s\S]*?<\/table>/i);
	if (!accounts)
		throw new AnyBalance.Error('Не найдена таблица счетов и карт. Сайт изменен?');
	var card_tr = getParam(accounts, null, null, new RegExp('<tr[^>]*>(?:[\\s\\S](?!</tr))*?XXXXXX' + (prefs.card ? prefs.card : '\\d{4}') + '[\\s\\S]*?</tr>', 'i'));
	if (!card_tr)
		throw new AnyBalance.Error(prefs.card ? 'Не найдена карта с последними цифрами ' + prefs.card : 'Не найдено ни одной карты');
	var result = {success: true};
	
	getParam(html, result, 'fio', /<div[^>]+id="name"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(card_tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(card_tr, result, 'cardname', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(card_tr, result, 'cardnum', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(card_tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(card_tr, result, ['currency', 'balance', 'gracepay', 'minpay', 'limit', 'accbalance', 'own', 'blocked'], /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	
	if (AnyBalance.isAvailable('pct', 'accnum', 'limit', 'credit_till', 'minpaytill', 'minpay', 'gracetill', 'gracepay', 'accbalance', 'own', 'blocked')) {
		var accid = getParam(card_tr, null, null, /accountid=([\-0-9]+)/i);
		if (accid) {
			html = AnyBalance.requestGet(baseurl + 'Accounts/Account.aspx?accountid=' + accid + '&systemid=ssOpenway');
			getParam(html, result, 'accnum', /<span[^>]+id="[^"]*LabelCardAccountNumber"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
			getParam(html, result, 'pct', /<span[^>]+id="[^"]*LabelCardRate"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'limit', /<span[^>]+id="[^"]*LabelCardCreditLimit"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'credit_till', /<span[^>]+id="[^"]*LabelCardCreditLimitEndDate"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDate);
			getParam(html, result, 'minpaytill', /<span[^>]+id="[^"]*LabelCardMonthlyPaymentDate"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDate);
			getParam(html, result, 'gracetill', /<span[^>]+id="[^"]*LabelCardGracePeriodEndDate"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDate);
			getParam(html, result, 'minpay', /<span[^>]+id="[^"]*LabelCardMinimumPayment"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'gracepay', /<span[^>]+id="[^"]*LabelCardGracePeriodSum"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'accbalance', /<span[^>]+id="[^"]*LabelCardRest"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'own', /<span[^>]+id="[^"]*LabelCardOwnMoney"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'blocked', /<span[^>]+id="[^"]*LabelCardBlocked"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
		} else {
			AnyBalance.trace('Не удалось найти идентификатор счета карты и получить по ней подробную информацию');
		}
	}
	AnyBalance.setResult(result);
}