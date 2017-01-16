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

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://my.bank.com.ua/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'LoginForm.action', g_headers);

	html = AnyBalance.requestPost(baseurl + 'Login.action', {
		user:	prefs.login,
		sms:	'',	
		md5psw:	hex_md5(prefs.password),
	}, addHeaders({Referer: baseurl + 'LoginForm.action'}));

	if (!/logout/i.test(html)) {
		var error = getElement(html, /<div[^>]+message-error/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	html = AnyBalance.requestGet(baseurl + 'MainAccountsShow.action', addHeaders({Referer: baseurl}));

	var model = getElement(html, /<model[^>]+CardsListCardsModel/i, replaceTagsAndSpaces, getJson);
	AnyBalance.trace(JSON.stringify(model));
	
	var result = {success: true}, aggregate_space = create_aggregate_join(' ');

	for(var i=0; i<model.cards_list.length; ++i){
		var card = model.cards_list[i];
		if(!prefs.card_num || endsWith(card.cardNo, prefs.card_num) || endsWith(card.accountNo, prefs.card_num)){
			getParam(card.fullOwnerName, result, 'fio');		
			getParam(card.cardNo, result, 'card_number');
			getParam(card.accountNo, result, 'acc_name');

			sumParam(card.prefixName, result, '__tariff', null, null, null, aggregate_space);
			sumParam(card.basesUppName, result, '__tariff', null, null, null, aggregate_space);
			sumParam(card.cardType, result, '__tariff', null, null, null, aggregate_space);

			if(card.availableAmount){
				getParam(card.availableAmount.AMOUNT_ONLINE_FORMAT || card.availableAmount.AMOUNT_FORMAT, result, 'balance', null, null, parseBalance);
			}else{
				getParam(card.amountCashed, result, 'balance');
			}

			getParam(card.currency, result, ['currency', 'balance'], null, null, CurrencyISO.getCurrencySymbol);
			
			AnyBalance.setResult(result);
			return;
		}
	}

	for(var i=0; model.acc2624_list && i<model.acc2624_list.length; ++i){
		var acc = model.acc2624_list[i];
		if(!prefs.card_num || endsWith(acc.accountNo, prefs.card_num)){
			getParam(acc.availableAmountSaving && acc.availableAmountSaving.CARD_NO, result, 'card_number');
			getParam(acc.accountNo, result, '__tariff');

			getParam(acc.accountNo, result, 'acc_name');

			if(acc.availableAmountSaving){
				getParam(acc.availableAmount.AMOUNT_ONLINE_FORMAT || acc.availableAmount.AMOUNT_FORMAT, result, 'balance', null, null, parseBalance);
			}else{
				getParam(acc.amount, result, 'balance');
			}
			getParam(acc.currency, result, ['currency', 'balance'], null, null, CurrencyISO.getCurrencySymbol);
			
			AnyBalance.setResult(result);
			return;
		}
	}
	
	AnyBalance.setResult(result);
}