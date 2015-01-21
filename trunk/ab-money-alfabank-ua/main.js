/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:34.0) Gecko/20100101 Firefox/34.0'
};

function main(){
    var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

    var baseurl = 'https://my.alfabank.com.ua/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

	html = AnyBalance.requestPost(baseurl + 'login', {
        'forbiddenUrl':'',
        'login_':prefs.login,
        password:prefs.password,
        nonce:'',
		ok:''
    }, addHeaders({Referer: baseurl + 'login'}));

	var otpa = getParam(html, null, null, /код смс-подтверждения/i);
	if(otpa) {
		if(AnyBalance.getLevel() >= 7){
			AnyBalance.trace('Пытаемся ввести код смс-подтверждения');
			code = AnyBalance.retrieveCode("Пожалуйста, введите код смс-подтверждения", 'R0lGODlhBAAEAJEAAAAAAP///////wAAACH5BAEAAAIALAAAAAAEAAQAAAIElI8pBQA7', {time: 240000, inputType: 'number'});
			AnyBalance.trace('Код получен: ' + code);
			html = AnyBalance.requestPost(baseurl + 'loginConfirm', {
			action:'next',
		        otp:code
	                }, addHeaders({Referer: baseurl + 'loginConfirm'}));
		}else{
			throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
		}
	}
	
	if (!/class="logout"/i.test(html)) {
		var error = getParam(html, null, null, /icon exclamation[\s\S]*?"text"[\s\S]*?>\s*([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Проверьте, пожалуйста, правильность ввода логина и пароля/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	// Успешно вошли в кабинет, теперь получаем балансы
	if(prefs.type == 'dep')
        processDep(html, baseurl);
    else if(prefs.type == 'credit')
        processCredit(html, baseurl);
    else 
        processCard(html, baseurl);
}

function processCard(html, baseurl){
	var prefs = AnyBalance.getPreferences();
	
    if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите 4 последних цифры номера карты или не вводите ничего, чтобы показать информацию по первой карте");

	html = AnyBalance.requestGet(baseurl + 'get_home_page_block?block=groupCardAccount&_=' + new Date().getTime(), g_headers);		

	//class="card(?:[^>]*>){1}\s*[x\d]{10,}0105(?:[^>]*>){5,9}[^>]*CardContractAction.view\?contract=\d+
	var card = getParam(html, null, null, new RegExp('class="card(?:[^>]*>){1}\\s*[x\\d]{10,}' + (prefs.cardnum || '') + '(?:[^>]*>){5,9}[^>]*CardContractAction.view\\?contract=(\\d+)', 'i'));
	checkEmpty(card, 'Не удалось найти ' + (prefs.cardnum ? 'карту с последними цифрами ' + prefs.cardnum : 'ни одной карты!'), true);

	html = AnyBalance.requestGet(baseurl + 'CardContractAction.view?contract=' + card, g_headers);

	var result = {success: true};

	getParam(html, result, 'fio', /<span>Рады Вас видеть,([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Общий баланс([^>]*>){5}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'limit', /лимит:([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'limit', 'balance'], /Общий баланс([^>]*>){5}/i, replaceTagsAndSpaces, parseCurrency);
    getParam(html, result, '__tariff', /(\d{4}\s*xxxxxxx\s*\d{4})/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'card_num', /(\d{4}\s*xxxxxxx\s*\d{4})/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'acc_num', /Список операций по счету №\s*(\d{10,})/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'card_name', /"defaultSettingsId_productName"([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

function processDep(html, baseurl){
	throw new AnyBalance.Error('Депозиты не поддерживаются в данной версии, свяжитесь с автором по e-mail.');
}

function processCredit(html, baseurl, _accnum, result){
     html = AnyBalance.requestGet(baseurl + 'get_home_page_block?block=groupCredit&_=1374241044354', g_headers);

    /*var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите 4 последних цифры номера карты или не вводите ничего, чтобы показать информацию по первой карте");*/

    var result = {success: true};
    getParam(html, result, 'balance', /Условия договора(?:[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /Счет погашения кредита(?:[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'period', /Срок предоставления(?:[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

	getParam(html, result, 'next_payment', /Следующий платеж(?:[^>]*>){2,50}\s*<div class="column column-D-H">[^>]*>\s*необходимо([\s\S]*?)<\/span/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'next_payment_date', /Следующий платеж(?:[^>]*>){2,50}\s*<div class="column column-D-H">([^<]+)</i, replaceTagsAndSpaces, parseDate);

    AnyBalance.setResult(result);
}