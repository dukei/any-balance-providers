/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language':	'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':		'keep-alive',
	'User-Agent':		'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36'
};

var baseurl = 'https://kaspi.kz';

function login() {
	var prefs = AnyBalance.getPreferences();

	AnyBalance.setDefaultCharset('utf-8');
	
	if (AnyBalance.getData) {
		// заполняем эту куку, чтобы не запрашивался пароль из смс
		var kaspiTag = AnyBalance.getData('kaspi-tag');
		if (kaspiTag) {
			AnyBalance.setCookie('kaspi.kz', 'kaspi-tag', kaspiTag);
		}
	}
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + '/entrance', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту интернет-банка! Попробуйте обновить данные позже.');
	}

	if (!/logout/i.test(html)) {
		var form = getElement(html, /<form[^>]+LoginForm/i);
		if (!form){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось получить форму авторизации. Сайт изменен?');
		}
		var params = AB.createFormParams(form, function(params, str, name, value){
			if(name == 'Login')
				return prefs.login;
			else if(name == 'Password')
				return prefs.password;
			return value;
		});

		html = AnyBalance.requestPost(baseurl + '/SignIn', params, addHeaders({
			'Referer': baseurl + '/entrance',
			//'Content-Type': 'application/x-www-form-urlencoded'
		}));
		
		var error = getParam(html, null, null, /<div[^>]+class="entrance__inputErrorMessage[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Пароль введен неверно/i.test(error));

		if (/SMSCodeForm/i.test(html)) {
			// при первой авторизации банк запрашивает одноразовый код из смс
			AnyBalance.trace('Отправляем запрос на сервер для получения SMS-кода');
			var subHtml = AnyBalance.requestPost(baseurl + '/SendEntranceOtp', null, addHeaders({
				'X-Requested-With': 'XMLHttpRequest',
				'Accept': 'application/json, text/javascript, */*; q=0.01',
				'Referer': baseurl + '/SignIn'
			}));
			var json = getJson(subHtml);
			if (json.status !== 'OK') {
				AnyBalance.trace(subHtml);
				AnyBalance.trace('Сервер должен был отправить SMS с кодом, но вернул ошибку');
				throw new AnyBalance.Error('Не удалось отправить SMS с кодом. Сайт изменен?');
			}
			
			var smsCode = AnyBalance.retrieveCode('Вам отправлено SMS-сообщение с кодом для входа в личный кабинет Каспи банка. Введите код из SMS', null, {
				inputType: 'number',
				minLength: 4,
				maxLength: 4,
				time: 300000
			});
            
			var subHtml = AnyBalance.requestPost(baseurl + '/CheckEntranceOtp', {'otp': smsCode}, addHeaders({
				'X-Requested-With': 'XMLHttpRequest',
				'Accept': 'application/json, text/javascript, */*; q=0.01',
				'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
				'Referer': baseurl + '/SignIn'
			}));
			json = getJson(subHtml);
			if (json.status === 'INVALID_OTP') {
				AnyBalance.trace('Введен некорректный код из SMS');
				throw new AnyBalance.Error('Вы ввели некорректный код из SMS. Попробуйще ещё раз.');
			} else if (json.status !== 'OK') {
				AnyBalance.trace(subHtml);
				AnyBalance.trace('При проверке кода из SMS произошла неизвестная ошибка.');
				throw new AnyBalance.Error('Не удалось проверить код из SMS. Сайт изменен?');
			}
			
			var form = getElement(html, /<form[^>]+SMSCodeForm/i);
			if (!form){
				AnyBalance.trace(html);
				throw new AnyBalance.Error('Не удалось получить форму ввода кода из SMS. Сайт изменен?');
			}

			var smsFormParams = AB.createFormParams(form, function(params, str, name, value) {
				if (name == 'Otp')
					return smsCode;
				else if (name == 'Login')
					return prefs.login;
				return value;
			});
			
			html = AnyBalance.requestPost(baseurl + '/SignIn', smsFormParams, addHeaders({
				'Referer': baseurl + '/SignIn'
			}));
		}
		
		if (!/logout/i.test(html)) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось зайти в интернет-банк. Сайт изменен?');
		}
		
		if (AnyBalance.setData) {
			// сохраняем куку, чтобы при следующей авторизации снова не запрашивался код из смс
			AnyBalance.setData('kaspi-tag', AnyBalance.getCookie('kaspi-tag'));
			AnyBalance.saveData();
		}
		
	} else {
		AnyBalance.trace('Уже залогинены, используем существующую сессию');
		html = AnyBalance.requestGet(baseurl + '/bank', g_headers);
	}
	
    __setLoginSuccessful();
	
	return html;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
	if(!AnyBalance.isAvailable('cards'))
		return;

    var cards = [];
    var kaspiGoldUrl = getParam(html, null, null, /<a[^>]+class="myProductsMenu__link[^>]+href="([^>]*?)"[^>]*>\s*Kaspi Gold/i);
    if (kaspiGoldUrl) {
        AnyBalance.trace('Нашли карту Kaspi Gold, получаем базовую информацию.');
        
        html = AnyBalance.requestGet(baseurl + kaspiGoldUrl, g_headers);
        
        var title = AB.getParam(html, null, null, /<div[^>]+bankProducts__item--gold[\s\S]*?bankProducts__title[^>]*?>([\s\S]*?)<div/i, AB.replaceTagsAndSpaces);
        
        cards.push({
            'url': kaspiGoldUrl,
            'type': 'gold',
            'title': title,
            'html': html,
        });
    }

	if(!cards.length){
        AnyBalance.trace(html);
        AnyBalance.trace('У вас нет карт.');
		return;
	}

	AnyBalance.trace('Найдено карт: ' + cards.length);
	result.cards = [];
	
	for(var i=0; i < cards.length; ++i){
		var card = cards[i];

		var c = {__id: card.title, __name: card.title, num: card.title};

		if (__shouldProcess('cards', c)) {
			processCard(card, c);
		}
        
        result.cards.push(c);
	}
}

function processCard(card, result) {
    AnyBalance.trace('Обработка карты ' + result.__name);

    var html = card.html;
    
    // на данный момент нет доступных карт, у которых есть счетчики: cards.limit, cards.debt, cards.status, cards.till, cards.pay_till
    
    AB.getParam(html, result, 'cards.balance',                     /Доступно(?:[^>]*>){2}([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalanceSilent);
    AB.getParam(html, result, ['cards.currency', 'cards.balance'], /Доступно(?:[^>]*>){2}([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseCurrency);
	
	var href_info = AB.getParam(html, null, null, /<a[^>]+href="([^"]*)"[^>]+class="[^"]+productsMainMenu__item--card[^"]+"/i);
	if(!href_info) {
		AnyBalance.trace(card);
		AnyBalance.trace("Не удалось найты ссылку на страницу с информацией о карте. Сайт изменён?");
	} else {
		var html = AnyBalance.requestGet(baseurl + href_info, g_headers);

        AB.getParam(html, result, 'cards.num',    /Номер карты(?:[^>]*>){2}([^<]*)/i,   AB.replaceTagsAndSpaces);
        AB.getParam(html, result, 'cards.status', /Статус(?:[^>]*>){2}([^<]*)/i,        AB.replaceTagsAndSpaces);
        AB.getParam(html, result, 'cards.till',   /Срок действия(?:[^>]*>){2}([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseDateWord);
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(html, result) {
	if(!AnyBalance.isAvailable('deposits'))
		return;

    var depositsUrl = getParam(html, null, null, /<a[^>]+class="myProductsMenu__link[^>]+href="([^>]*?)"[^>]*>\s*Депозиты/i);
    
	html = AnyBalance.requestGet(baseurl + depositsUrl, g_headers);

    var deposits = AB.getElements(html, /<a[^>]+myProductsSubMenu__link[^>]*\/bank\/Deposit\/\d+"[^>]*>/ig);

	if(!deposits.length && /\/Deposit\/\d+\/History$/i.test(AnyBalance.getLastUrl())){
		AnyBalance.trace('Депозит, видимо, только один. Оказались на его странице');
		deposits = ['<a href="' + AnyBalance.getLastUrl().replace(/\/History$/i, '') + '">'];
	}

	if(!deposits.length){
		AnyBalance.trace(html);
        AnyBalance.trace('Не удалось найти депозиты. Сайт изменён?');
	}

	AnyBalance.trace("Найдено депозитов: " + deposits.length);
	result.deposits = [];
	
	for(var i = 0; i < deposits.length; i++) {
		var href_info = AB.getParam(deposits[i], null, null, /<a[^>]+href="([^"]*)"[^>]*>/i);
		if(!href_info) {
			AnyBalance.trace("Не удалось найти ссылку на страницу с информацией о депозите. Сайт изменён?");
			continue;
		}
		html = AnyBalance.requestGet(joinUrl(baseurl, href_info + '/About'), g_headers);

		var id    = AB.getParam(html, null, null, /Номер счета Депозита:(?:[^>]*>){2}([^<]*)/i, AB.replaceTagsAndSpaces),
			num   = AB.getParam(html, null, null, /Номер счета Депозита:(?:[^>]*>){2}([^<]*)/i, AB.replaceTagsAndSpaces),
			title = AB.getParam(html, null, null, /Название(?:[^>]*>){2}([^<]*)/i,  AB.replaceTagsAndSpaces);


		var c = {__id: id, __name: title, num: num};

		if (__shouldProcess('deposits', c)) {
			processDeposit(deposits[i], c, html);
		}

		result.deposits.push(c);
	}
}

function processDeposit(deposit, result, html) {
	AB.getParam(html, result, 'deposits.balance',    /Накоплено(?:[^>]*>){2}([\s\S]*?)<\/div>/i,  AB.replaceTagsAndSpaces, AB.parseBalance);

	AB.getParam(html, result, 'deposits.agreement',  /Номер договора(?:[^>]*>){2}([^<]*)/i,     							 AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'deposits.date_start', /Вы открыли вклад(?:[^>]*>){2}([^<]*)/i,   							 AB.replaceTagsAndSpaces, AB.parseDate);
	AB.getParam(html, result, 'deposits.dvk_till',   /Дата будущего продления(?:[^>]*>){2}([^<]*)/i,   						 AB.replaceTagsAndSpaces, AB.parseDate);
	AB.getParam(html, result, 'deposits.pct',        /Эффективная ставка(?:[^>]*>){2}([^<]*)/i, 							 AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'deposits.withdraw',   /Доступно для снятия(?:[\s\S]*?<span[^>]*>)([^<]*)/i,                   AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'deposits.currency',   /Валюта Депозита(?:[^>]*>){2}([^<]*)/i,  							     [AB.replaceTagsAndSpaces, /(.*?)/i, '0$1'], AB.parseCurrency);

	AB.getParam(html, result, 'deposits.dvk_status', /<div[^>]+class="text dvk_status"(?:[^>]*>){4}([^<]*)/i,  AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'deposits.dvk_num',    /<div[^>]+class="dvkcard_number"[^>]*>([^<]*)/i,          AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'deposits.dvk_till',   /<div[^>]+class="card_valid_thru"[^>]*>([^<]*)/i,    	   AB.replaceTagsAndSpaces, AB.parseDate);
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCredits(html, result) {
    throw new AnyBalance.Error('Получение информации о кретидах ещё не реализовано. Обратитесь к разработчику программы.');
    
	if(!AnyBalance.isAvailable('credits'))
		return;

	html = AnyBalance.requestGet(baseurl + '/index.aspx?action=bank', g_headers);

	var creditList = AB.getElement(html, /<div[^>]+id="item_credits"[^>]*>/i);
	if(!creditList){
		if(/У вас нет кредитов/i.test(html)){
			AnyBalance.trace('У вас нет кредитов');
			result.cards = [];
		}else {
			AnyBalance.trace(html);
			AnyBalance.trace('Не удалось найти таблицу с картами.');
		}
		return;
	}

	var credits = AB.getElements(creditList, /<div[^>]+creditInfoWrapper[^>]*>/ig);
	if(!credits) {
		AnyBalance.trace(creditList);
		AnyBalance.trace("Не удалось найти кредиты. Сайт изменён?");
	}

	AnyBalance.trace('Найдено кредитов: ' + credits.length);
	result.credits = [];
	
	for(var i=0; i < credits.length; ++i){
		var _id   = AB.getParam(credits[i], null, null, /<span[^>]+"e-card__title__text"[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces),
			title = AB.getParam(credits[i], null, null, /<span[^>]+"e-card__title__text"[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces),
			num   = AB.getParam(credits[i], null, null, /<span[^>]+"e-card__title__text"[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces);
		
		var c = {__id: _id, __name: title, num: num};
		
		if(__shouldProcess('credits', c)) {
			processCredit(credits[i], c);
		}
		
		result.credits.push(c);
	}
}

function processCredit(html, result){
    AnyBalance.trace('Обработка кредита ' + result.__name);

	AB.getParam(html, result, 'credits.balance', 	 /<span[^>]+"e-limit__info__amount"[^>]*>([\s\S]*?)<div/i, 			  	 AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, ['credits.currency', 'credits.balance'], 	 /<span[^>]+"e-limit__info__amount"[^>]*>([\s\S]*?)<div/i, 			  	 AB.replaceTagsAndSpaces, AB.parseCurrency);
	AB.getParam(html, result, 'credits.paid', 	  	 /<span[^>]+"e-limit__subtext e-funds__amount"[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'credits.next_pay', 	 /<span[^>]+"e-plan__info__amount"[^>]*>([\s\S]*?)<\/div>/i, 			 AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'credits.pay_till', 	 /<span[^>]+"e-transfer__day"[^>]*>([\s\S]*?)<\/div>/i, 				 AB.replaceTagsAndSpaces, AB.parseDateWord);
	AB.getParam(html, result, 'credits.date_start',  /Вы взяли кредит([\s\S]*?)<\/div>/i, 									 AB.replaceTagsAndSpaces, AB.parseDate);
	AB.getParam(html, result, 'credits.period',      /На срок([\s\S]*?)<\/div>/i, 											 AB.replaceTagsAndSpaces, AB.parseBalance); //мес
	AB.getParam(html, result, 'credits.period_left', /Осталось выплачивать([\s\S]*?)<\/div>/i, 							     AB.replaceTagsAndSpaces, AB.parseBalance); //мес

    if(AnyBalance.isAvailable('credits.schedule')) {
        processCreditSchedule(html, result);
    }
}

function processWallet(html, result){
	if(!AnyBalance.isAvailable('info.wallet'))
		return;
    
    var walletUrl = getParam(html, null, null, /<a[^>]+class="myProductsMenu__link[^>]+href="([^>]*?)"[^>]*>\s*Kaspi Кошелек/i);
    if (!walletUrl) {
		AnyBalance.trace(html);
        AnyBalance.trace('Не удалось найти ссылку на страницу Kaspi Кошелька.');
		return;
    }
    
    html = AnyBalance.requestGet(baseurl + walletUrl, g_headers);

    var info = result.info;
    
    getParam(html, info, 'info.wallet', /Доступно(?:[^>]*>){2}([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    getParam(html, info, ['info.currency', 'info.wallet'], /Доступно(?:[^>]*>){2}([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseCurrency);
}

function processBonuses(html, result){
	if(!AnyBalance.isAvailable('info.bonus'))
		return;
    
    html = AnyBalance.requestGet(baseurl + '/bonus', g_headers);

    var info = result.info;
    
    getParam(html, info, 'info.bonus', /Доступно(?:[^>]*>){2}([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
}

function processInfo(html, result){
/*	var bankSections = AB.getElements(html, /<a[^>]+myProductsMenu__link[^>]*>/ig)
	if(!bankSections){
		AnyBalance.trace(html);
        AnyBalance.trace('Не удалось найти блок со ссылками на продукты пользователя.');
		throw new AnyBalance.Error('Не удалось найти информацию о пользователе в личном кабинете. Сайт изменён?');
	}*/
    
    var info = result.info = {};

    getParam(getElement(html, /<span[^>]+headerAuth__user/i), info, 'info.fio', null, AB.replaceTagsAndSpaces);
    
    processWallet(html, result);
    processBonuses(html, result);
}
