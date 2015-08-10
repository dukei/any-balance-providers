/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.81 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://onlinebanking.usbank.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Please, enter the login!');
	checkEmpty(prefs.password, 'Please, enter the password!');
	
	// Прежде чем входить, вынем куки
	// Почему-то иногда падает, завернем
	try {
		AnyBalance.restoreCookies();
	} catch(e) {}
	
	var html = AnyBalance.requestGet(baseurl + 'Auth/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'Auth/Login/Login', {
		PersonalId: prefs.login,
		'MachineAttribute': 'colorDepth=24|width=1920|height=1080|availWidth=1920|availHeight=1040|platform=Win32|javaEnabled=Yes|userAgent=Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.81 Safari/537.36'
	}, addHeaders({Referer: baseurl + 'login'}));
	
	var answer,question;
	if(/Answer Your Security Question/i.test(html)) {
		if(AnyBalance.getLevel() >= 7){
			AnyBalance.trace('Entering secret question...');
			
			var question = getParam(html, null, null, /Answer Your Security Question(?:[^>]*>){4}\s*<label>([\s\S]*?)<\//i);
			answer = AnyBalance.retrieveCode(question);
			AnyBalance.trace('Got answer: ' + answer);
		}else{
			throw new AnyBalance.Error('This provider requires AnyBalance API v7, please, update AnyBalance!');
		}
		
		html = AnyBalance.requestPost(baseurl + 'Auth/Login/StepUpCheck', {
			'StepUpShieldQuestion.AnswerFormat':'ALPHANUM',
			'StepUpShieldQuestion.Answer':answer,
			'StepUpShieldQuestion.QuetionText':question,
			'StepUpShieldQuestion.AnswerMaxLength':'40',
			'MachineAttribute': 'colorDepth=24|width=1920|height=1080|availWidth=1920|availHeight=1040|platform=Win32|javaEnabled=Yes|userAgent=Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.81 Safari/537.36',
			'StepUpShieldQuestion.RegisterComputer':true
		}, addHeaders({Referer: baseurl + 'Auth/Login/Login'}));
	}
	
	html = AnyBalance.requestPost(baseurl + 'access/oblix/apps/webgate/bin/webgate.dll?/Auth/Signon/Signon', {
		userid: prefs.login,
		password: prefs.password,
	}, addHeaders({Referer: baseurl + 'login'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Can`t login, maybe the site has been chenged?');
	}
	
	var accounts = getParam(html, null, null, /refreshedAccounts\s*=\s*(\[\{[\s\S]*?\}\])\s*;/i, null, getJson);
	var account;
	
	if(prefs.digits) {
		for(var i = 0; i < accounts.length; i++) {
			
			if(endsWith(accounts[i].AccountNumber, prefs.digits)) {
				AnyBalance.trace('Got nedeed account that ends with ' + prefs.digits);
				account = accounts[i];
				break;
			}
		}
	} else 
		account = accounts[0];
	
	if(!account)
		throw new AnyBalance.Error('Can`t find ' + (prefs.digits ? 'account that ends with ' + prefs.digits : 'at least one account!'));
	
	var result = {success: true};
	
	getParam(account.AvailableBalance + '', result, 'balance_avail', null, replaceTagsAndSpaces, parseBalance);
	getParam(account.CurrentBalance + '', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(account.AvailableCredit + '', result, 'credit', null, replaceTagsAndSpaces, parseBalance);
	getParam(account.CurrentBalance + '', result, ['currency', 'balance'], null, replaceTagsAndSpaces, parseCurrencyMy);
	getParam(account.DisplayName, result, '__tariff', null, replaceTagsAndSpaces, html_entity_decode);
	getParam(account.AccountTypeDescription, result, 'acc_type', null, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.saveCookies();
	AnyBalance.saveData();
	AnyBalance.setResult(result);
}

function parseCurrencyMy(text) {
	var val = getParam(html_entity_decode(text).replace(/\s+/g, ''), null, null, /(\S*?)-?\d[\d.,]*/);
	AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
	return val;
}