/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	// Mobile
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	// Desktop
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://usbbank.com.ua/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'Login.aspx?ReturnUrl=%2f', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт интернет банка временно недоступен. Попробуйте ещё раз позже.');
	}

	var form = getParam(html, null, null, /<form[^>]+id="aspnetForm"[^>]*>[\s\S]*?<\/form>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа. Сайт изменен?');
	}
	
	var params = createFormParams(form, function(params, str, name, value) {
		if (/UserName/i.test(name)) 
			return prefs.login;
		else if (/Password/i.test(name))
			return prefs.password;
		else if(/CaptchaTextBox/i.test(name)){
			var curl = getParam(form, null, null, /<img[^>]+class="cap_img"[^>]*src="([^"]*)/i, null, html_entity_decode);
			var captcha = AnyBalance.requestGet(baseurl + curl, g_headers);
			return AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', captcha);
		}

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'Login.aspx?ReturnUrl=%2f', params, addHeaders({Referer: baseurl + 'login'}));
	
	if (!/logoffLinkButton/i.test(html)) {
		var error = getParam(html, null, null, /<span[^>]+class="failuretext"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /логін або пароль|Login or password|логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	if(prefs.type == 'card'){
		fetchCard(baseurl);
	}else if(prefs.type == 'acc'){
	    fetchAcc(baseurl);
	}else{
		fetchCard(baseurl);
	}
}

function fetchCard(baseurl){
	var prefs = AnyBalance.getPreferences();
	checkEmpty(!prefs.num || /^\d{4}$/.test(prefs.num), 'Введите в настройки 4 последние цифры номера карты, информацию по которой вы хотите посмотреть, или не вводите ничего, чтобы посмотреть информацию по первой карте');

	var html = AnyBalance.requestGet(baseurl + '_Applications/IBank/ClientView/CardsList.aspx', g_headers);

	var cards = getElement(html, /<table[^>]+id="[^"]*rdCards_ctl00"[^>]*>/i);
	if(!cards){
	    AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти таблицу карт!');
	}

	cards = getParam(cards, null, null, /<tbody[^>]*>[\s\S]*?<\/tbody>/i);
	var rows = sumParam(cards, null, null, /<tr[^>]*>[\s\S]*?<\/tr>/ig);
	var header;

	for(var i=0; i<rows.length; ++i){
		if(/<tr[^>]+class="rgGroupHeader"/i.test(rows[i])){
			//Заголовок группы карт
			header = rows[i];
		}else{
			//Карта
			var number = getParam(rows[i], null, null, /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
			if(!prefs.num || endsWith(number, prefs.num)){
				loadCardInfo(baseurl, header, rows[i]);
				return;
			}
		}
	}

    AnyBalance.trace(cards);
	if(!prefs.num){
		throw new AnyBalance.Error('Не удалось найти ни одной карты!');
	}else{
		throw new AnyBalance.Error('Не удалось найти карту с последними цифрами ' + prefs.num + '!');
	}
}

function loadCardInfo(baseurl, header, card){
    var url = getParam(card, null, null, /CardInfo\.aspx\?CardId=\d+/i, null, html_entity_decode);
    if(!url){
    	AnyBalance.trace(card);
    	throw new AnyBalance.Error('Не удалось найти ссылку на информацию по карте. Сайт изменен?');
    }

    var html = AnyBalance.requestGet(baseurl + '_Applications/IBank/ClientView/' + url);
    
    var result = {success: true};

    getParam(html, result, 'cardholder', /(?:Власник|Owner|Держатель)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'till', /(?:Дійсна до|Valid until|Действительна до)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
	getParam(card, result, 'cardnum', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(card, result, 'cardtype', /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(card, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(card, result, ['currency', 'balance', 'accbalance', 'limit', 'blocked'], /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    var accfio = getParam(html, null, null, /(?:Головний рахунок|Main account|Основной счет)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i);
    if(accfio){
    	getParam(accfio, result, 'accnum', /([\s\S]*?)(?:<br|$)/i, replaceTagsAndSpaces, html_entity_decode);
    	getParam(accfio, result, 'fio', /<br[^>]*>([\s\S]*)/i, replaceTagsAndSpaces, html_entity_decode);
    }
    if(AnyBalance.isAvailable('fio') && !isset(result.fio)){
    	getParam(html, result, 'fio', /<a[^>]+href="\/Profile\/View.aspx"[^>]*>([\s\S]*?)(?:<\/a>|\()/i, replaceTagsAndSpaces, html_entity_decode);
    }
    
    getParam(html, result, 'accbalance', /(?:Залишок на рахунку|Account balance|Остаток на счете)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balance', /(?:Залишок на карті|Card balance|Остаток на карте)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'limit', /(?:Кредитний ліміт|Credit limit|Кредитный лимит)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'blocked', /(?:Заблоковано по карті|Hold|Заблокировано по карте)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /(?:Статус картки|Status|Ст[ау]тус карты)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    getParam(header, result, 'agreement', /(?:Договір):([^<]*)/i, null, html_entity_decode);

    AnyBalance.setResult(result);
}

function fetchAcc(baseurl){
	var prefs = AnyBalance.getPreferences();
	checkEmpty(!prefs.num || /^\d{4}$/.test(prefs.num), 'Введите в настройки 4 последние цифры номера счета, информацию по которому вы хотите посмотреть, или не вводите ничего, чтобы посмотреть информацию по первому счету');

	var html = AnyBalance.requestGet(baseurl + '_Applications/IBank/ClientView/AmountsList.aspx', g_headers);

	var cards = getElement(html, /<table[^>]+id="[^"]*rgAm_ctl00"[^>]*>/i);
	if(!cards){
	    AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти таблицу счетов!');
	}

	cards = getParam(cards, null, null, /<tbody[^>]*>[\s\S]*?<\/tbody>/i);
	var rows = sumParam(cards, null, null, /<tr[^>]*>[\s\S]*?<\/tr>/ig);
	var header;

	for(var i=0; i<rows.length; ++i){
		if(/<tr[^>]+class="rgGroupHeader"/i.test(rows[i])){
			//Заголовок группы карт
			header = rows[i];
		}else{
			//Карта
			var number = getParam(rows[i], null, null, /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, /\D/g, ''], html_entity_decode);
			if(!prefs.num || endsWith(number, prefs.num)){
				loadAccInfo(baseurl, html, header, rows[i]);
				return;
			}
		}
	}

    AnyBalance.trace(cards);
	if(!prefs.num){
		throw new AnyBalance.Error('Не удалось найти ни одного счета!');
	}else{
		throw new AnyBalance.Error('Не удалось найти счет с последними цифрами ' + prefs.num + '!');
	}
}

function loadAccInfo(baseurl, html, header, card){
    var result = {success: true};
    	
    getParam(header, result, 'fio', /Власник:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    if(AnyBalance.isAvailable('fio') && !isset(result.fio)){
    	getParam(html, result, 'fio', /<a[^>]+href="\/Profile\/View.aspx"[^>]*>([\s\S]*?)(?:<\/a>|\()/i, replaceTagsAndSpaces, html_entity_decode);
    }

	getParam(card, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(card, result, 'accname', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(card, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(card, result, 'balance', /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(card, result, ['currency', 'balance'], /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);

    AnyBalance.setResult(result);
}
