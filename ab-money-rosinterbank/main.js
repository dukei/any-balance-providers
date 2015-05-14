/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_phrases = {
   karty: {card: 'карты', acc: 'счета', dep: 'договора на вклад'},
   kartu: {card: 'карту', acc: 'счет', dep: 'договор на вклад'},
   karte1: {card: 'первой карте', acc: 'первому счету', dep: 'первому вкладу'},
   karty1: {card: 'одной карты', acc: 'одного счета', dep: 'одного вклада'}
}

//Заменяем системную строку замен
var myReplaceTagsAndSpaces = [replaceTagsAndSpaces, /(\d)\-(\d)/g, '$1.$2'];

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://b2c.rosinterbank.ru/lite/app";
    AnyBalance.setDefaultCharset("utf-8");
	
    var what = prefs.what || 'card';
    if(prefs.num && !/\d{4}/.test(prefs.num))
        throw new AnyBalance.Error("Введите 4 последних цифры номера " + g_phrases.karty[what] + " или не вводите ничего, чтобы показать информацию по " + g_phrases.karte1[what]);
	
    var html = AnyBalance.requestGet(baseurl + "/pub/Login");
    
    var matches = /wicketSubmitFormById\(['"](id\d+)['"]\s*,\s*['"][^\/]+([^'"]+)/i.exec(html);
    if(!matches){
        var prof = getParam(html, null, null, /<title>(Профилактические работы)<\/title>/i);
        if(prof)
            throw new AnyBalance.Error("В настоящее время в системе Интернет-банк проводятся профилактические работы. Пожалуйста, попробуйте ещё раз позже.");
        throw new AnyBalance.Error("Не удаётся найти форму входа в интернет-банк! Сайт недоступен или изменения на сайте.");
    }

    var id=matches[1], href=matches[2];
    var params = {};
    params[id + "_hf_0"] = '';
    params.hasData = 'X';
    params.login=prefs.login;
    params.password=prefs.password;

    html = AnyBalance.requestPost(baseurl + href, params);

    var error = getParam(html, null, null, /<span[^>]*class="feedbackPanelERROR"[^>]*>([\s\S]*?)(<script|<\/span>)/i, replaceTagsAndSpaces);
    if(error)
        throw new AnyBalance.Error(error);

    var needsms = getParam(html, null, null, /(sms-message-panel|Введите SMS-код)/i);
    if(needsms)
        throw new AnyBalance.Error("Для работы этого провайдера требуется отключить в настройках интернет-банка подтверждение входа по СМС. Это безопасно, для совершения операций все равно будет требоваться подтверждение по СМС.");

    AnyBalance.trace("We seem to enter the bank...");

    if(what == 'dep')
        mainDep(what, baseurl);
    else
        mainCardAcc(what, baseurl);
}

function mainCardAcc(what, baseurl){
    var prefs = AnyBalance.getPreferences();
    var html = AnyBalance.requestGet(baseurl + "/priv/accounts");
	
    var pattern;
    if(what == 'card')
		// Я маньяк :)
		// <div\s+class="account-block"(?:[^>]*>){3}[^>]*acc_\d+(?:[^>]*>){1,200}\d{4}\s*(?:\*{4}\s*){1,3}3998[\s\S]*?class="account-amounts"(?:[\s\S]*?</div[^>]*>){12}
        pattern = new RegExp('<div\\s+class="account-block"(?:[^>]*>){3}[^>]*acc_\\d+(?:[^>]*>){1,200}\\d{4}\\s*(?:\\*{4}\\s*){1,3}' + (prefs.num || '\\d{4}')+ '[\\s\\S]*?class="account-amounts"(?:[\\s\\S]*?</div[^>]*>){12}');
    else
		// <div\s+class="account-block"(?:[^>]*>){3}[^>]*acc_\d+221738(?:[\s\S]*?</div[^>]*>){12}
        pattern = new RegExp('<div\\s+class="account-block"(?:[^>]*>){3}[^>]*acc_\\d+' + (prefs.num || '') + '[\\s\\S]*?class="account-amounts"(?:[\\s\\S]*?</div[^>]*>){12}', 'i');
	
	AnyBalance.trace('Pattern is: ' + pattern);
	var account = getParam(html, null, null, pattern);
	if(!account) {
        if(prefs.num)
            throw new AnyBalance.Error('Не удалось найти ' + g_phrases.kartu[what] + ' с последними цифрами ' + prefs.num);
		else
            throw new AnyBalance.Error('Не удалось найти ни ' + g_phrases.karty1[what] + '!');
    }
	AnyBalance.trace('Found account block: ' + account);
	AnyBalance.trace('Card num was: ' + prefs.num);
	
	var result = {success: true};
	
	getParam(account, result, 'accnum', /Номер:(?:[^>]*>){3}\s*(\d{16,20})/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(account, result, 'accname', /bind\(this\)\);">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
	
	getParam(account, result, '__tariff', new RegExp('\\d{4}\\s*(?:\\*{4}\\s*){2}' + (prefs.num || '\\d{4}'), 'i'), replaceTagsAndSpaces, html_entity_decode);
	getParam(result.__tariff, result, 'cardnum');
	
	var balancesArray = [/Средств на счете[\s\S]*?<span[^>]+class="amount"[^>]*>([\s\S]*?)<\/div/i, /Доступно по картам(?:[^>]*>){2}([\s\S]*?)<\/div/i, 
		/"card-amounts[^>]*>[^>]*class="amount">[^>]*>((?:[\s\S]*?<\/span>){2})/i, 
		/Остаток собственных средств на карте(?:[^>]*>){4}([^<]*)/i];
	
	getParam(account, result, ['currency', 'balance'], balancesArray, myReplaceTagsAndSpaces, parseCurrency);
	getParam(account, result, 'balance', balancesArray, myReplaceTagsAndSpaces, parseBalance);
	// Это актуально только для счета
	if(what == 'acc')
		getParam(account, result, 'accamount', balancesArray, myReplaceTagsAndSpaces, parseBalance);
	// Это только для кредита
	getParam(account, result, 'credit_used', /Использованный кредит(?:[^>]*>){4}([^<]*)/i, myReplaceTagsAndSpaces, parseBalance);
	getParam(account, result, 'credit_pay_to', /Оплатить до([^<]*)/i, myReplaceTagsAndSpaces, parseDate);
	getParam(account, result, 'credit_pay_sum', /Оплатить до(?:[^>]*>){4}([^<]*)/i, myReplaceTagsAndSpaces, parseBalance);
	
	// пока не знаю откуда это
	getParam(account, result, 'blocked', /Сумма необработанных операций[\s\S]{1,70}class="amount">([\s\S]*?)<\/span>/i, myReplaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}

function mainDep(what, baseurl){
    var prefs = AnyBalance.getPreferences();
    var html = AnyBalance.requestGet(baseurl + "/priv/deposits");
	
	//<tr>\s*<td>\s*<div class="black"(?:[^>]*>){5}57759(?:[^>]*>){25}\s*</td>\s*</tr>
	pattern = new RegExp('<tr>\\s*<td>\\s*<div class="black"(?:[^>]*>){5}\\d*' + (prefs.num || '') + '(?:[^>]*>){25}\\s*</td>\\s*</tr>', 'i');
	
	AnyBalance.trace('Pattern is: ' + pattern);
	var deposit = getParam(html, null, null, pattern);
	if(!deposit) {
        if(prefs.num)
            throw new AnyBalance.Error('Не удалось найти ' + g_phrases.kartu[what] + ' с номером договора ' + prefs.num);
		else
            throw new AnyBalance.Error('Не удалось найти ни ' + g_phrases.karty1[what] + '!');
    }
	AnyBalance.trace('Found deposit block: ' + deposit);
	AnyBalance.trace('Deposit num was: ' + prefs.num);
	
	var result = {success: true};
	
	getParam(deposit, result, '__tariff', /<div class="black"([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(deposit, result, 'accname', /<div class="black"([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(deposit, result, 'cardnum', /class="deposit-link"([^>]*>){4}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(deposit, result, 'balance', /<div class="black"([^>]*>){17}/i, replaceTagsAndSpaces, parseBalance);
	getParam(deposit, result, 'currency', /<div class="black"([^>]*>){13}/i, replaceTagsAndSpaces, html_entity_decode);
	
    if(AnyBalance.isAvailable('accnum')){
        var href = getParam(html, null, null, /class="deposit-link" href="[.\/]*([^"]+)/i);
		
        html = AnyBalance.requestGet(baseurl + '/' + href);
        getParam(html, result, 'accnum', /Счет вклада[\s\S]*?<td[^>]*>\s*(\d+)/i);
    }

    AnyBalance.setResult(result);
}