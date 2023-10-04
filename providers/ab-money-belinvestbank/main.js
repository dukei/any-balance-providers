/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Charset':'utf-8, iso-8859-1, utf-16, *;q=0.7',
	'Accept-Language':'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Cache-Control': 'max-age=0',
	'Connection':'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
};

var g_currency = {
	BYN: 'р',
	BLR: 'р',
	RUB: '₽',
	RUR: '₽',
	USD: '$',
	EUR: '€',
	GBP: '£',
	JPY: 'Ұ',
	CHF: '₣',
	CNY: '¥',
	undefined: ''
};

var g_cardKind = {
	0: 'Дебетовая',
	1: 'Кредитная',
	undefined: 'Не определен'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://ibank.belinvestbank.by/';
	var loginurl = 'https://login.belinvestbank.by/';
	var result = {success: true};

	try {
		AnyBalance.setDefaultCharset('utf-8');
		
		checkEmpty(prefs.login, "Введите логин!");
		checkEmpty(prefs.password, "Введите пароль!");
		checkEmpty(!prefs.cardnum || /^\d{4}$/i.test(prefs.cardnum), 'Необходимо ввести 4 последние цифры номера карты, либо не вводить ничего!');
			
		var html = AnyBalance.requestGet(loginurl + 'signin', g_headers);

		if(!html || AnyBalance.getLastStatusCode() > 400){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
		}

		var encryptArrayVar = getParam(html, /var\s*keyLang\s*=\s*\[([^\]]*)/i);
		var encryptArray = sumParam(encryptArrayVar, /\d+/ig);
		
		var params = {
	        login: prefs.login,
	        password: cod(prefs.password, encryptArray),
	        typeSessionKey: 0
	    };
		
		if(/Код с картинки/i.test(html) && /captcha__img/.test(html)){
			AnyBalance.trace('Сайт затребовал капчу');
			var imgUrl = getParam(html, /<div[^>]+class="captcha__img"[^>]*>[\s\S]*?img src=\"([^\"]*)/i);
			var img2 = joinUrl(loginurl, imgUrl);
			
			var img = AnyBalance.requestGet(joinUrl(loginurl, imgUrl), addHeaders({Referer: loginurl + 'signin'}));
			
			var keyStr = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", img, {
			//	inputType: 'number',
			//	minLength: 5,
			//	maxLength: 5,
				time: 180000
			});
			
			params['keystring'] = keyStr;
		}
		
		html = AnyBalance.requestPost(loginurl + 'signin', params, addHeaders({'Content-Type': 'application/x-www-form-urlencoded', Referer: loginurl + 'signin'}));

		if(!/На Ваш номер телефона/i.test(html) && /showDialog\s*\(\s*'#confirmation_close_session/.test(html)){
			AnyBalance.trace('Аннулируем предыдущий вход');
			html = AnyBalance.requestPost(loginurl + 'confirmationCloseSession', {}, addHeaders({'Content-Type': 'application/x-www-form-urlencoded', Referer: loginurl + 'signin'}));
		}

		if(!/На Ваш номер телефона/i.test(html)){
			var error = getElement(html, /<[^>]+(?:error|alert__msg)/i, replaceTagsAndSpaces);
			if(!error)
				error = getElement(html, /<[^>]+(?:label_type_error)/i, replaceTagsAndSpaces);
			if(error)
				throw new AnyBalance.Error(error, null, /Парол/i.test(error));
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось войти в интернет-банк. Сайт изменен?');
		}

		var smsKey;
		AnyBalance.trace('Пытаемся ввести смс код.');
		var msg = getElement(html, /<div[^>]+dialog__greets/i, [/<div[^>]+dialog__title[\s\S]*?<\/div>/i, '', replaceTagsAndSpaces]);
		smsKey = AnyBalance.retrieveCode(msg || "Пожалуйста, введите код из смс", null, {inputType: 'number', time: 180000});
		AnyBalance.trace('Код из смс получен: ' + smsKey);

		html = AnyBalance.requestPost(loginurl + 'signin2', {
	        action: 1,
	        key: smsKey
	    }, addHeaders({'Content-Type': 'application/x-www-form-urlencoded', Referer: loginurl + 'signin2'}));

		// ПРОВЕРКА НА НЕВЕРНЫЙ КОД ИЗ СМС!
		if(!/logout/i.test(html)) {
			var error = getElement(html, /<[^>]+(?:error|alert__msg)/i, replaceTagsAndSpaces);
			if(error)
				throw new AnyBalance.Error(error);

			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось зайти в интернет-банк. Сайт изменен?');
		}
		
		html = AnyBalance.requestGet(baseurl + 'cards', addHeaders({'Referer':baseurl}));

        var cards = getJsonObject(html, /var cardsList\s*?=\s*?/);

		if(!cards.length){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось найти ни одной карты!');
		}
		
		var currCard;
		
		for(var i=0; i<cards.length; ++i){
		    var card = cards[i];
		    AnyBalance.trace('Найдена карта ' + card.num + ' ("' + card.cardName + '")');
		    if(!currCard && (!prefs.card || endsWith(card.num, prefs.card))){
	       	    AnyBalance.trace('Выбрана карта ' + card.num + ' ("' + card.cardName + '")');
	       	    currCard = card;
	        }
	    }

		if(!currCard){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось найти' + ( prefs.cardnum ? ' карту с последними цифрами ' + prefs.cardnum : ' ни одной карты!' ));
		}
		
		var cardId = currCard.msCardId;
		
		html = AnyBalance.requestPost(baseurl + 'cards/balance-by-card', {msCardId: cardId}, addHeaders({
			'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
			'Referer': baseurl,
			'X-Requested-With': 'XMLHttpRequest'
		}));
		
		var json = getJson(html);
		
		getParam(json.balance, result, 'balance', null, null, parseBalance);
		getParam(g_currency[currCard.currency]||currCard.currency, result, ['currency', 'balance'], null, null);
		getParam(currCard.currency, result, 'currencyfull', null, null);
		getParam(currCard.cardName + currCard.fullNum.replace(/(.*)(\d{4})$/i, ' $2'), result, '__tariff', null, null);
		getParam(currCard.fullNum, result, 'cardnum', null, null);
		getParam(currCard.cardName, result, 'cardname', null, null);
		getParam(currCard.type, result, 'cardtype', null, null);
		getParam(g_cardKind[currCard.isCredit]||currCard.isCredit, result, 'cardkind', null, null);
		getParam(currCard.cardHolder, result, 'cardholder', null, null);
		getParam((currCard.expdate)*1000, result, 'validto', null, null);
	} finally {
		// Выходим, чтобы закончить сессию. Нужно, так как запрещено 2 одновременных подключения.
		AnyBalance.requestGet(baseurl + 'logout', g_headers);
		AnyBalance.trace("Вышли из интернет банка.");
	}
	
    AnyBalance.setResult(result);
}

function cod(str, keyLang) {
	var lang = ['Q','W','E','R','T','Y','U','I','O','P','A','S','D','F','G','H','J','K','L','Z','X','C','V','B','N','M','q','w','e','r','t','y','u','i','o','p','a','s','d','f','g','h','j','k','l','z','x','c','v','b','n','m','Й','Ц','У','К','Е','Н','Г','Ш','Щ','З','Х','Ъ','Ф','Ы','В','А','П','Р','О','Л','Д','Ж','Э','Я','Ч','С','М','И','Т','Ь','Б','Ю','й','ц','у','к','е','н','г','ш','щ','з','х','ъ','ф','ы','в','а','п','р','о','л','д','ж','э','я','ч','с','м','и','т','ь','б','ю','1','2','3','4','5','6','7','8','9','0','_','.','-'];
	var result = '';
	var pass = str.split('');
	for (n = 0; n < pass.length; n++) {
		var isLegal = false;
		if (pass[n]) {
			for (i = 0; i < lang.length; i++) {
				if (pass[n] == lang[i]) {
					result += String.fromCharCode(keyLang[i]);
					isLegal = true;
				}
			}
			if (!isLegal) {
				result += pass[n];
			}
		} else {
			break;
		}
	}
	return result;
}