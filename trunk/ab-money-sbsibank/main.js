/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru,en;q=0.8',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/33.0.1750.146 Safari/537.36',
	'Origin': 'https://www.sbsibank.by',
	'Cache-Control': 'max-age=0',
};

var g_banks = {
	'0226':'imobile/', //ОАО "Банк БелВЭБ"
	//0182:'', // ОАО "Технобанк"
	'0272':'mmbank/', //ОАО "Банк Москва-Минск"
	//0175:'', //ЗАО "БелСвиссБанк"
	//0110:'', //ЗАО "РРБ-Банк"
	'0755':'ideabank/', //ЗАО "Идея Банк"
	//0270:'', //ЗАО "Альфа-Банк"
}

function getMessage(html) {
	return getParam(html, null, null, /var\s+Message\s*=\s*['"]([^'"]+)['"]\s*;/i, replaceTagsAndSpaces, html_entity_decode);
}

function getLoginParams(html, prefs) {
	var form = getParam(html, null, null, /<form[^>]*action="login.ashx"[\s\S]*?<\/form>/i);
	checkEmpty(form, 'Не удалось найти форму входа, сайт изменен?', true);
	
	var params = createFormParams(form, function(params, str, name, value) {
		if (name == 'usn') 
			return prefs.login;
		else if (name == 'pwd')
			return prefs.password;
		else if (name == 'bank')
			return prefs.bank_type || '0755';
		
		return value;
	});
	
	return params;
}

function main() {
	var prefs = AnyBalance.getPreferences();
	
	var baseurl = 'https://www.sbsibank.by/';
	AnyBalance.setDefaultCharset('windows-1251');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var bankType = g_banks[prefs.bank_type || '0755'];
	checkEmpty(bankType, 'Ну удалось узнать тип банка, сайт изменен?', true);
	
	// Запросим страницу логина
	var html = AnyBalance.requestGet(baseurl + bankType, g_headers);
	
	// Сначала пробуем войти напрямую
	var params = getLoginParams(html, prefs);
	
	html = AnyBalance.requestPost(baseurl + bankType + 'login.ashx', params, addHeaders({Referer: baseurl + bankType}));
	
	if(/Введите код с картинки|Введен неверный код/i.test(getMessage(html))) {
		AnyBalance.trace('Требуется ввод капчи.');
		
		params = getLoginParams(html, prefs);
		// Войти с тем же паролем не получится, он там энкодится, но выводится в input :)
		params.pwd = getParam(html, null, null, /<input type="password"[^>]*value="([^"]+)/i);
		
		if(AnyBalance.getLevel() >= 7) {
			AnyBalance.trace('Пытаемся ввести капчу');
			var captcha = AnyBalance.requestGet(baseurl + bankType + 'captcha.ashx?r=' + Math.random(), addHeaders({Referer: baseurl + bankType + 'start.aspx?mode=5'}));
			params.captcha = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
			AnyBalance.trace('Капча получена: ' + params.captcha);
		} else {
			throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
		}
		
		html = AnyBalance.requestPost(baseurl + bankType + 'login.ashx', params, addHeaders({Referer: baseurl + bankType + 'start.aspx?mode=5'}));
	}
	
	if (!/quit\.ashx/i.test(html)) {
		var error = getMessage(html);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + bankType +'services.aspx', g_headers);
	
	var cardsForm = getParam(html, null, null, /<h1>(?:Карточки|Список карт)<\/h1>[\s\S]*?<\/form>/i);
	checkEmpty(cardsForm, 'Не удалось найти форму с картами, сайт изменен?', true);
	
	// Далее надо узнать какую карту смотреть
	var card = prefs.lastdigits;
	//https://www.sbsibank.by/mbottom.asp?crd_id=4379318
	var cards = sumParam(cardsForm, null, null, /<input type=['"]radio[^>]*set_curr_crd\.ashx\?crd=\d+[\s\S]*?<\/label>/ig);
	checkEmpty(cards, 'Не удалось найти ни одной карты в интернет-банке, сайт изменен?', true);
	AnyBalance.trace('Найдено карт: ' + cards.length);
	var result = {success: true};
	getParam(html, result, 'fio', /Пользователь\s*:([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
	var cardCurrent = getParam(html, null, null, />Карточка\s*:(?:[^>]*>){3}([\s\S]*?)<\/td/i, replaceTagsAndSpaces);

	if(!card) {
		AnyBalance.trace('Не указана карта в настройках, будет показана информация по карте: ' + cardCurrent);
	} else {
		//https://www.sbsibank.by/ideabank/balance.ashx?bal_type=B&time=1393586772876
		for(var i =0; i < cards.length; i++) {
			// Проверяем карты
			var id = getParam(cards[i], null, null, new RegExp('set_curr_crd\\.ashx\\?crd=(\\d+)[^>]*>\\s*<label[^>]*>[\\d.]*' + card + '[^<]*</label>', 'i'));
			if(!id) {
				AnyBalance.trace('Карта ' + cards[i] + ' не соответствует заданной ' + card);
			} else {
				AnyBalance.trace('Карта ' + cards[i] + ' соответствует заданной ' + card);
				
				html = AnyBalance.requestPost(baseurl + bankType + 'aj_set_curr_crd.ashx?crd=' + id + '&time=' + new Date().getTime(), {}, addHeaders({
					Referer: baseurl + bankType + 'services.aspx',
					'X-Requested-With':'XMLHttpRequest'
				}));
				break;
			}
		}
		html = AnyBalance.requestGet(baseurl + bankType + 'services.aspx', g_headers);
		cardCurrent = getParam(html, null, null, />Карточка\s*:(?:[^>]*>){3}([\s\S]*?)<\/td/i, replaceTagsAndSpaces);
	}
	
	html = AnyBalance.requestPost(baseurl + bankType + 'balance.ashx?bal_type=B&time=' + new Date().getTime(), {}, addHeaders({
		Referer: baseurl + bankType + 'services.aspx',
		'X-Requested-With':'XMLHttpRequest'			
	}));
	
	getParam(cardCurrent, result, '__tariff');
	getParam(cardCurrent, result, 'cardnum');
	
	var clearBalances = getParam(html, null, null, null, replaceTagsAndSpaces, html_entity_decode);
	AnyBalance.trace(clearBalances);
	
	var balanceRegExp = /Доступный остаток средств на карте([\s\d.,-]+\S+)/i;
	
	getParam(clearBalances, result, 'balance', balanceRegExp, replaceTagsAndSpaces, parseBalance);
	getParam(clearBalances, result, ['currency', 'balance'], balanceRegExp, replaceTagsAndSpaces, parseCurrency);
	
	AnyBalance.setResult(result);
}