/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru,en;q=0.8',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/33.0.1750.146 Safari/537.36',
	'Origin': 'https://www.belveb24.by',
	'Cache-Control': 'max-age=0',
};


function getMessage(html) {
	return getParam(html, null, null, /var\s+Message\s*=\s*['"]([^'"]+)['"]\s*;/i, replaceTagsAndSpaces);
}

function getLoginParams(html, prefs) {
	var form = getParam(html, null, null, /<form[^>]*action="login.php"[\s\S]*?<\/form>/i);
	checkEmpty(form, 'Не удалось найти форму входа, сайт изменен?', true);
	
	var params = createFormParams(form, function(params, str, name, value) {
		if (name == 'login') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;
		
		
		return value;
	});
	
	return params;
}

function main() {
	var prefs = AnyBalance.getPreferences();
	
	var baseurl = 'https://www.belveb24.by/';
	AnyBalance.setDefaultCharset('windows-1251');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	
	
	// Запросим страницу логина
	var html = AnyBalance.requestGet(baseurl , g_headers);
	
	// Сначала пробуем войти напрямую
	var params = getLoginParams(html, prefs);
	
	html = AnyBalance.requestPost(baseurl  + 'login.php', params, addHeaders({Referer: baseurl }));
	
	if(/Введите код с картинки|Введен неверный код/i.test(getMessage(html))) {
		AnyBalance.trace('Требуется ввод капчи.');
		
		params = getLoginParams(html, prefs);
		// Войти с тем же паролем не получится, он там энкодится, но выводится в input :)
		params.pwd = getParam(html, null, null, /<input type="password"[^>]*value="([^"]+)/i);
		
		if(AnyBalance.getLevel() >= 7) {
			AnyBalance.trace('Пытаемся ввести капчу');
			var captcha = AnyBalance.requestGet(baseurl + 'captcha.ashx?r=' + Math.random(), addHeaders({Referer: baseurl  + 'start.aspx?mode=5'}));
			params.captcha = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
			AnyBalance.trace('Капча получена: ' + params.captcha);
		} else {
			throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
		}
		
		html = AnyBalance.requestPost(baseurl+ 'login.php', params, addHeaders({Referer: baseurl }));
	}
	
	if (!/login\.php\?logout=1/i.test(html)) {
		var error = getMessage(html);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	paramss ='a:4:{s:6:"source";s:77:"O:9:"connector":4:{s:6:"result";N;s:3:"lct";N;s:7:"message";N;s:5:"error";N;}";s:9:"className";s:9:"connector";s:6:"method";s:6:"xroute";s:9:"arguments";s:65:"a:1:{i:0;a:1:{s:11:"proxy.class";a:1:{s:12:"getCardsList";b:1;}}}";}';
	paramss2='a:4:{s:6:"source";s:77:"O:9:"connector":4:{s:6:"result";N;s:3:"lct";N;s:7:"message";N;s:5:"error";N;}";s:9:"className";s:9:"connector";s:6:"method";s:6:"xroute";s:9:"arguments";s:69:"a:2:{i:0;a:1:{s:11:"proxy.class";a:1:{s:10:"clientData";b:1;}}i:1;N;}";}';
	paramss3='a:4:{s:6:"source";s:77:"O:9:"connector":4:{s:6:"result";N;s:3:"lct";N;s:7:"message";N;s:5:"error";N;}";s:9:"className";s:9:"connector";s:6:"method";s:6:"xroute";s:9:"arguments";s:69:"a:2:{i:0;a:1:{s:11:"proxy.class";a:1:{s:10:"getCheques";b:1;}}i:1;N;}";}';
	html = AnyBalance.requestPost(baseurl  + 'admin.php?xoadCall=true', paramss, addHeaders({Referer: baseurl }));
	html2 = AnyBalance.requestPost(baseurl  + 'admin.php?xoadCall=true', paramss2, addHeaders({Referer: baseurl }));
	html3 = AnyBalance.requestPost(baseurl  + 'admin.php?xoadCall=true', paramss3, addHeaders({Referer: baseurl }));
	var cardsForm = html;
	checkEmpty(html, 'Не удалось найти форму с картами, сайт изменен?', true);

	// Далее надо узнать какую карту смотреть
	var card = prefs.lastdigits;
	
	var cards = sumParam(html, null, null, /"Card4":"([0-9].[0-9]*)/ig);
	checkEmpty(cards, 'Не удалось найти ни одной карты в интернет-банке, сайт изменен?', true);
	AnyBalance.trace('Найдено карт: ' + cards.length);
	var result = {success: true};
	var s=getJsonEval(html2).returnObject.result.client.ClientData[0];
	var fio =s.NAMF+' '+s.NAMI+' '+s.NAMO;
	AnyBalance.trace(fio);
	
	getParam(fio, result, 'fio');
	
	var	card_pars=getJsonEval(html);
	var cardres=card_pars.returnObject.result.cards.row[0]['Card4'];
	AnyBalance.trace(cardres);
	var cheques=getJsonEval(html3).returnObject.result.cheques.ChequesList[0];
	if(!card) {
		AnyBalance.trace('Не указана карта в настройках, будет показана информация по карте: ' + cardres);
		getParam(card_pars.returnObject.result.cards.row[0]['CardName'], result, '__tariff');
		var clearBalances = getParam(html, null, null, null, replaceTagsAndSpaces);
		 AnyBalance.trace(clearBalances);
			getParam(card_pars.returnObject.result.cards.row[0]['Card4'], result, 'cardnum');
			getParam(clearBalances, result, 'balance', card_pars.returnObject.result.cards.row[0]['Balance'], replaceTagsAndSpaces, parseBalance);
			getParam(card_pars.returnObject.result.cards.row[0]['CurrName'], result, 'currency');
				
				
	} else {
		
		for(var i =0; i < cards.length; i++) {
			// Проверяем карты
			var id = getParam(card_pars.returnObject.result.cards.row[i]['Card4'], null, null, new RegExp('[0-9].' + card , 'i'));
			if(!id) {
				AnyBalance.trace('Карта ' + card_pars.returnObject.result.cards.row[i]['Card4'] + ' не соответствует заданной ' + card);
			
			} else {
				AnyBalance.trace('Карта ' + card_pars.returnObject.result.cards.row[i]['Card4'] + ' соответствует заданной ' + card);
				var clearBalances = getParam(html, null, null, null, replaceTagsAndSpaces);
				 AnyBalance.trace(clearBalances);
					getParam(card_pars.returnObject.result.cards.row[i]['CardName'], result, '__tariff');
					getParam(card_pars.returnObject.result.cards.row[i]['Card4'], result, 'cardnum');
					getParam(clearBalances, result, 'balance', card_pars.returnObject.result.cards.row[i]['Balance'], replaceTagsAndSpaces, parseBalance);
					getParam(card_pars.returnObject.result.cards.row[i]['CurrName'], result, 'currency');
			
				break;
			}
		}
		
	}
	var chec="Чек №"+cheques.ID+"\n \""+cheques.TRANS_DATE+'",\n Назначение: "'+cheques.DESCR+'",\n Сумма: "'+cheques.TRANS_AMOUNT+' '+cheques.CURR+'"';
	getParam(chec, result, 'chec_end');
	AnyBalance.trace(chec);
	if(!html)
		throw new AnyBalance.Error('Не удалось получить баланс по карте. Проверьте, что вы оплатили доступ в Интернет-Банк');
	
	

	AnyBalance.setResult(result);
}
