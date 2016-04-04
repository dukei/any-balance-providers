/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset':	'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':	'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':		'keep-alive',
	'User-Agent':		'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.87 Safari/537.36'
};

var baseurl = 'https://online.russipoteka.ru/web_banking/';

function login() {
		var prefs = AnyBalance.getPreferences();

		AnyBalance.setDefaultCharset('utf-8');

		checkEmpty(prefs.login, 'Введите логин!');
		checkEmpty(prefs.password, 'Введите пароль!');

		var html = AnyBalance.requestGet(baseurl + 'protected/welcome.jsf', g_headers);

		if(!html || AnyBalance.getLastStatusCode() > 400){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Ошибка при подключении к сайту интернет-банка! Попробуйте обновить данные позже.');
		}

		if (!/logout/i.test(html)) {
			html = AnyBalance.requestPost(baseurl + 'login.jsf', {
				'form:login': 					prefs.login,
				'form:password': 				prefs.password,
				'form:captchaText': 			'',
				'form:loginForm_SUBMIT': 		1,
				'javax.faces.ViewState': 		getParam(html, null, null, /<input[^>]+name="javax.faces.ViewState"[^>]+value="([^"]*)/i),
				'javax.faces.behavior.event': 	'action',
				'javax.faces.partial.event': 	'click',
				'javax.faces.source': 			'form:loginBtn',
				'javax.faces.partial.ajax': 	true,
				'javax.faces.partial.execute': 'form:login form:captchaText',
				'form:loginForm': 				'form:loginForm'
			}, addHeaders({
				Referer: baseurl + 'protected/welcome.jsf'
			}));

			var json = getJson(
				getParam(html, null, null, /(\{[^<]*)<\/message/i));
			if(json.showCaptcha) {
				AnyBalance.trace("Капчунька нужна...");
			}
			html = AnyBalance.requestPost(baseurl + 'j_security_check', {
				'j_username': 		prefs.login,
				'j_password': 		prefs.password,
				'device_id': 		'',
				'captcha': 			'',
				'activation_code': 	'',
				'locale': 			'ru'
			}, addHeaders({
				Referer: baseurl + 'protected/welcome.jsf'
			}));


		}else{
			AnyBalance.trace('Уже залогинены, используем существующую сессию')
		}

		if(/<input[^>]+otp_type_3_input[^>]*>/i.test(html)) {
			var emvSessionID = getParam(html, null, null, /<input[^>]+emvSessionid[^>]+value="([^"]*)/i);

			html = AnyBalance.requestPost(baseurl + 'smsPasswordLoginAjaxServlet', {
				smsSentTime: new Date().getTime()
			}, addHeaders({
				Referer: baseurl + 'j_security_check'
			}));

			var sessionID = getParam(html, null, null, /(\d+)/i);
			if(!sessionID || ! emvSessionID) {
				throw new AnyBalance.Error("Не удалось найти ID сессии. Сайт изменён?");
			};

			var code = AnyBalance.retrieveCode('Пожалуйста, введите код из SMS для входа в интернет-банк. (ID: ' + sessionID + ')', null, {inputType: 'number', time: 180000});
			try {
				html = AnyBalance.requestPost(baseurl + 'j_security_check', {
					'session_id' : 		sessionID,
					register_computer:	'',
					'otp_type_7_input': '',
					'otp_type_6_input': '',
					'otp_type_4_input': '',
					'otp_type_3_input': code,
					'otp_type_1_input': '',
					'otp_type': 		'3',
					'otp':				code,
					'os_name':			'',
					'locale':			'ru',
					'j_username':		prefs.login,
					'emvSessionId': 	emvSessionID,
					'device_id':		'',
					'computer_name':	'',
					'browser_name':		''
				}, addHeaders({
					Referer: baseurl + 'j_security_check'
				}));
			} catch(e) {
				AnyBalance.trace(e);
				html = AnyBalance.requestGet(baseurl + 'protected/welcome.jsf', g_headers);
			}
		}

		if (!/logout/i.test(html)) {
			var error = getParam(html, null, null, /<div[^>]+messageBox-content iconError[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
			if (error)
				throw new AnyBalance.Error(error, null, /Неверно указаны данные для входа в систему/i.test(error));

			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось зайти в интернет-банк. Сайт изменен?');
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

    html = AnyBalance.requestGet(baseurl + 'protected/accounts_and_cards/index', g_headers);

    html = getParam(html, null, null, null, replaceHtmlEntities);
    var table = getElement(html, /<span[^>]+title[^>]*>Карты(?:[\s\S]*?)(<table[^>]+tblList[^>]*>)/i);
    var cards = getElements(table, /<tr[^>]*>/ig);
    if(!cards.length) {
      AnyBalance.trace(html);
      AnyBalance.trace("Карты не найдены.");
      return;
    }

    AnyBalance.trace('Найдено карт: ' + (cards.length - 1));
    result.cards = [];

    for(var i = 1; i < cards.length; ++i){
      var id 		= getParam(cards[i], null, null, /<a[^>]*>[^\d]*(\d*)/i);
      var num 	= getParam(cards[i], null, null, /<a[^>]*>[^\d]*(\d*)/i);
      var title = getParam(cards[i], null, null, /<tr(?:[^>]*>){4}([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);

      var c = {__id: id, __name: title, num: num};


      if (__shouldProcess('cards', c)) {
        processCard(cards[i], c, html);
      }

      result.cards.push(c);
    }
}

function processCard(card, result, html) {
    AnyBalance.trace('Обработка карты ' + result.__name);

    getParam(card, result, 'cards.balance', /<span[^>]+amount[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(card, result, ['cards.currency', 'cards.balance'], /<span[^>]+amount[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseCurrency);

    var params = {
        j_id_6h_2_SUBMIT:         getParam(html, null, null, /<input[^>]+j_id_6h_2_SUBMIT[^>]+value="([^"]*)/i),
        'javax.faces.ViewState':  getParam(html, null, null, /<input[^>]+javax.faces.ViewState[^>]+value="([^"]*)/i),
        'card_id':                getParam(card, null, null, /card_id([^']*'){3}/i, [/'/ig, ''])
      };

    var param_name    = getParam(card, null, null, /submitForm([^']*'){2}/i, [/'/ig, '']),
        param_value   = getParam(card, null, null, /submitForm([^']*'){4}/i, [/'/ig, '']);

    if(!param_name || !param_value) {
      AnyBalance.trace("Не удалось найти параметры запроса на подробную информацию по карте.");
      return;
    }
    params[param_name + ':_idcl'] = param_value;

    try {
      html = AnyBalance.requestPost(baseurl + 'protected/accounts_and_cards/index', params, addHeaders({
        Referer: baseurl + 'protected/accounts_and_cards/index'
      }));
    } catch(e) {
      AnyBalance.trace(e);
      html = AnyBalance.requestGet(baseurl + 'protected/accounts_and_cards/account_card_list.jsf', g_headers);
    }


    html = getParam(html, null, null, null, replaceHtmlEntities);

    getParam(html, result, 'cards.holder',    /Держатель:([^<]*)/i,        replaceTagsAndSpaces);
    getParam(html, result, 'cards.full_num',  /Карточный счет\s*([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'cards.till',      /Действительна до:([^<]*)/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'cards.agreement', /Номер договора:([^<]*)/i,   replaceTagsAndSpaces);

		if(isAvailable('cards.transactions')) {
      processCardTransactions(html, result);
    }
}

function processInfo(html, result){
  var info = result.info = {};
  getParam(html, info, 'info.fio', /<div[^>]+clientName[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(html, result) {
	throw new AnyBalance.Error("Обработка депозитов пока не поддерживается. Пожалуйста, обратитесь к разработчикам.");
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCredits(html, result) {
	throw new AnyBalance.Error("Обработка кредитов пока не поддерживается. Пожалуйста, обратитесь к разработчикам.");
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка счетов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(html, result) {
  throw new AnyBalance.Error("Обработка счетов пока не поддерживается. Пожалуйста, обратитесь к разработчикам.");
}


