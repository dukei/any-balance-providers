/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    Accept:'*/*',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Cache-Control':'max-age=0',
    'Accept-Encoding':null, //Че-то какой-то битый стрим она получает, ошибка EOFException вываливается. Отменяем сжатие
    Connection:'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.95 Safari/537.36',
	Referer:'Referer: https://mybank.oplata.kykyryza.ru/',
	channel: 'web'
};

var baseurl = 'https://mybank.oplata.kykyryza.ru/';

function callApi(verb, getParams, postParams){
	var method = 'GET';
	apiHeaders = g_headers;
	if(!apiHeaders['X-XSRF-TOKEN'])
		apiHeaders['X-XSRF-TOKEN'] = AnyBalance.getCookie('XSRF-TOKEN');

	var h = apiHeaders;
	if(isset(postParams)){
		method = 'POST';
		h = addHeaders({'Content-Type': 'application/json;charset=UTF-8'}, apiHeaders);
	}

	if(!getParams)
		getParams = {};
	if(!getParams.rid)
		getParams.rid = String(Math.random().toString(16).split(".")[1]);

	h = addHeaders({'X-Request-ID': getParams.rid}, apiHeaders);
	
	var html = AnyBalance.requestPost(baseurl + 'api/v0001/' + verb + '?' + createUrlEncodedParams(getParams), postParams && JSON.stringify(postParams), addHeaders(h), {HTTP_METHOD: method});

	var json = getJson(html);
	if(json.status != 'OK'){
		AnyBalance.trace(html);
		var e = new AnyBalance.Error(getErrorDescription(json.status), null, /AUTH|CANNOT_FIND_SUBJECT/i.test(json.status));
		e.status = json.status;
		throw e;
	}

	return json.data;
}


function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	//if(prefs.cabinet == 'new')
		doNewCabinet(prefs);
	/*else /*if(prefs.cabinet == 'old')*
		doOldCabinet(prefs);*/
}

function getEquity(card, type){
	var e = card.equities.filter(function(e){ return e.type==type })[0];
	return e || false;
}

function doNewCabinet(prefs){
	var html = AnyBalance.requestGet(baseurl, g_headers);

	var json = callApi('ping/session');
	try{
		json = callApi('authentication/auth-by-secret', null, {"principal":prefs.login,"secret":prefs.password,"type":"AUTO"});
	}catch(e){
		if(e.status === 'OTP_REQUIRED'){
			AnyBalance.trace('Потребовался ввод кода из SMS');
			var code = AnyBalance.retrieveCode('Пожалуйста, введите код из SMS', null, {inputType: 'number', time: 600000});
			json = callApi('authentication/confirm', null, {otp: code, principal: prefs.login});
		}else{
			throw e;
		}
	}
	
	json = callApi('cards');
	if(!json || !json[0])
		throw new AnyBalance.Error('Не найдено ни одной карты!');

	var card = findCard(json);

    var result = {success: true};
    getParam(getEquity(card, 'FUNDS').amount, result, 'balance', null, null, parseBalance);
    getParam(getEquity(card, 'BNS').amount, result, 'bonus', null, null, parseBalance);
    getParam(getEquity(card, 'BNS_AVAILABLE').amount, result, 'bonus_avail', null, null, parseBalance);
    getParam(getEquity(card, 'CREDIT_LIMIT_AMOUNT_REMAINING').amount, result, 'limit', null, null, parseBalance);

    if(isAvailable('minpay', 'minpay_till', 'limit')) {
    	try{
	   		json = callApi('credit');

	   	   	var crd = json && json.filter(function(c) { return c.cardId == card.id })[0];
	   	    
            getParam(crd && crd.minimalRequiredPaymentAmount, result, 'minpay', null, null, parseBalance);
            getParam(crd && crd.minimalRequiredPaymentDeadline, result, 'minpay_till', null, null, parseDateISO);
            getParam(crd && crd.grantedAmount, result, 'limit', null, null, parseBalance);
        }catch(e){
        	AnyBalance.trace('Can not get credit info: ' + e.message);
        }
    }

    result.__tariff = prefs.login;

    AnyBalance.setResult(result);
}

function findCard(cards){
	var prefs = AnyBalance.getPreferences();
	for(var i=0; i<cards.length; ++i){
		var c = cards[i];
		AnyBalance.trace('Найдена карта ' + c.ean + ', pan: ' + c.panTail);
		if(prefs.num && (
			endsWith(c.ean, prefs.num) || endsWith(c.panTail, prefs.num))){
				AnyBalance.trace('Подходит по последним цифрам');
				return c;
		}
		if(!prefs.num && c.ean == prefs.login){
			AnyBalance.trace('Подходит по ean');
			return c;
		}
	}

	if(!prefs.num)
		return json[0];

	throw new AnyBalance.Error('Не удалось найти карту с последними цифрами ' + prefs.num);
}

function getErrorDescription(code){
	var errors = {
            BAD_REQUEST: "Похоже, что-то пошло не так. Мы уже разбираемся, в чем дело. Попробуйте повторить операцию позже.",
            DEFAULT_ERROR: "Похоже, что-то пошло не так. Мы уже разбираемся, в чем дело. Попробуйте повторить операцию позже.",
            NETWORK_UNAVAILABLE: "Связь прервана, некоторые функции интернет-банка могут быть недоступны. Проверьте соединение с интернетом.",
            UNKNOWN_UNEXPECTED_GENERIC_EXCEPTION: "При запросе произошла ошибка, повторите вашу операцию позже.",
            INVALID_CONFIRM_AMOUNT: 'Введена неверная контрольная сумма, осталось <%= attempts %> <%= plural(attempts, {one: "попытка", few: "попытки", many: "попыток"}) %>',
            AUTH_LOCKED_TEMPORARY: 'Вы&nbsp;три раза ввели неверные данные, доступ в&nbsp;интернет-банк временно заблокирован. Повторно ввести пароль можно через <%= date(time, "mm:ss") %>.',
            CHANGE_AUTH_LOCKED_TEMPORARY: 'Вы&nbsp;три раза ввели неверные данные, доступ в&nbsp;интернет-банк временно заблокирован. Повторно ввести код подтверждения можно через <%= date(time, "mm:ss") %>.',
            RESET_AUTH_LOCKED_TEMPORARY: 'Вы&nbsp;три раза ввели неверные данные, доступ в&nbsp;интернет-банк временно заблокирован. Повторно ввести номер телефона можно через <%= date(time, "mm:ss") %>.',
            EXCEEDED_INCORRECT_ATTEMPTS_LIMIT: 'Превышено количество попыток ввода кода, доступ в интернет-банк временно заблокирован. Повторно ввести код подтверждения можно через <%= date(time, "mm:ss") %>.',
            AUTH_FORBIDDEN_BY_RESTRICTION: "Вход в интернет-банк с вашего устройства запрещен, в соответствии с вашим заявлением.",
            PRINCIPAL_IS_EMPTY: "Введите номер штрих-кода карты",
            AUTH_WRONG: "Проверьте правильность введенных данных и попробуйте войти повторно.",
            ACTIVATE_WRONG: "Проверьте правильность введенных данных.",
            FEDERAL_LAW_167_BLOCKING_ERROR: "Вход в&nbsp;интернет-банк невозможен, так как ваша карта заблокирована. За&nbsp;помощью обратитесь в&nbsp;<%= supportCenterBanner %>.",
            CANNOT_FOUND_AUTHENTICATION_PROVIDER: "Введите номер штрих-кода карты",
            CONSUMER_INITIALIZATION_HAS_ALREADY_SCHEDULED: "Подождите, идет загрузка данных",
            EAN_OUT_OF_RANGE: "Введите корректный номер штрих-кода карты",
            EAN_MUST_HAVE_13_SYMBOLS: "Номер штрих-кода карты должен состоять из 13 цифр",
            EAN_MUST_HAVE_DIGITS: "В поле могут содержаться только цифры без разделителей",
            INCORRECT_DATE_FORMAT: "Некорректная дата рождения",
            BIRTHDAY_IS_EMPTY: "Введите дату рождения",
            SECRET_CODE_IS_EMPTY: "Введите полученный код подтверждения доступа",
            OLD_SECRET_IS_EMPTY: "Введите старый пароль",
            CHANGE_AUTH_WRONG: "Указан неверный пароль или код подтверждения доступа",
            CANNOT_FIND_SUBJECT: "Проверьте правильность введенных данных и попробуйте войти повторно.",
            NEW_SECRET_IS_EMPTY: "Введите новый пароль",
            EMPTY_SECRET_NOT_ALLOWED: "Введите пароль",
            EMPTY_SECRET_NOT_ALLOWED_FIELD: "Введите пароль",
            MDSE_GENERAL_ERROR: "Минимальная длина пароля 6 символов",
            CONFIRMATION_CODE_IS_EMPTY: "Введите код активации",
            REPLACE_CODE_WRONG: "Указан неверный код активации",
            DP_GENERAL_ERROR: "При запросе произошла ошибка, повторите вашу операцию позже.",
            DP_LIMIT_EXCEEDED: "К сожалению, вы превысили доступный для переводов заграницу лимит. Попробуйте повторить перевод на следующий рабочий день.",
            SMS_SERVICE_TEMPORARY_UNAVAILABLE: "При запросе произошла ошибка, повторите вашу операцию позже.",
            DENIED: "Доступ в&nbsp;интернет-банк для вашей карты запрещен",
            UNAUTHORIZED_ACCESS_FROM_THIS_IP: "Произошел разрыв соединения, повторите попытку входа",
            PASSWORD_IS_EMPTY: "Введите код подтверждения",
            WRONG_DOCUMENT_OR_PASSWORD: "Неверный код подтверждения",
            WRONG_MERGE_PASSWORD: "Неверный код подтверждения",
            EXPIRED: "Истек срок действия, запросите код еще раз",
            EMPTY_PAY_TEMPLATE_AMOUNT: "Введите сумму",
            RECHARGE_DP_UNAVAILABLE: "Сервис временно недоступен. Пожалуйста, повторите попытку позже.",
            INCORRECT_AMOUNT: "Некорректная сумма пополнения",
            AMOUNT_OUT_OF_RANGE_MAX: "Превышена максимальная сумма пополнения",
            AMOUNT_OUT_OF_RANGE_MIN: "Минимальная сумма пополнения 10 рублей",
            INCORRECT_CONFIRM_AMOUNT: "Некорректная сумма подтверждения",
            CANNOT_REGISTER_CARD_FOR_NON_RESIDENT: "Невозможно добавить карту",
            DP_EXCEED_CARD_LIMIT: "Невозможно пополнить карту, превышен лимит баланса карты",
            NO_RECHARGE_AMOUNT: "Введите сумму пополнения",
            NO_CONFIRM_AMOUNT: "Введите сумму подтверждения",
            START_REG_CARD_ERR: "Невозможно совершить операцию, сервис недоступен. Повторите попытку позже.",
            CONFIRM_CARD_ERR: "Невозможно совершить операцию, сервис недоступен. Повторите попытку позже.",
            DELETE_CARD_ERR: "Невозможно совершить операцию, сервис недоступен. Повторите попытку позже.",
            START_FUNDING_ERR: "Невозможно совершить операцию, сервис недоступен. Повторите попытку позже.",
            GENERAL_ERROR: "Сервис временно недоступен. Пожалуйста, повторите попытку позже.",
            BETTA_ALREADY_REGISTERED: "Мы уже получили вашу заявку, спасибо!",
            BETTA_EMAIL_IS_EMPTY: "Введите e-mail",
            BETTA_BAD_EMAIL: "Введите корректный e-mail",
            BETTA_EMAIL_IS_TOO_LONG: "Превышена допустимая длина e-mail",
            FEEDBACK_EMPTY_MSG: "Введите, пожалуйста, ваше сообщение. Мы будем благодарны за любую обратную связь",
            FEEDBACK_BAD_EMAIL: "Введите, пожалуйста, корректный e-mail",
            FEEDBACK_EMPTY_EMAIL: "Введите, пожалуйста, e-mail, чтобы мы могли вам ответить или уточнить детали вашего обращения",
            MAIL_SEND_TURN_OFF: "К сожалению, по техническим причинам не получается отправить ваше сообщение. Попробуйте еще раз позже",
            MAIL_SENDER_TRANSPORT_ERROR: "К сожалению, по техническим причинам не получается отправить ваше сообщение. Попробуйте еще раз позже",
            DP_RECHARGE_ID_ERROR: "Невозможно совершить операцию, сервис недоступен. Повторите попытку позже",
            RECHARGE_DP_LOCKED_PERMANENT: "Карта, которую вы хотите пополнить, заблокирована.",
            RECHARGE_ORDER_REJECT: "Лимит пополнений на данный момент исчерпан. Вы сможете снова пополнять карту через 30 дней.",
            SERVICE_NOT_FOUND_TEMPLATE: "Оплата по шаблону невозможна, т.к. поставщик изменил реквизиты услуги или удалил ее. Попробуйте найти услугу заново и создать новый шаблон.",
            SERVICE_NOT_FOUND: "В настоящий момент оплатить данную услугу невозможно.",
            CANNOT_FIND_PROVIDER_FOR_FORM: "В настоящий момент оплатить данную услугу невозможно.",
            CANNOT_RESOLVE_PROVIDER_FOR_FORM: "В настоящий момент оплатить данную услугу невозможно.",
            TRIAL_RUN_NO_ACCESS: "Проходит закрытое тестирование данного функционала. Извините за доставленные неудобства.",
            CARD_NOT_IN_TRIAL_RUN: "Запрошенная функциональность в данный момент находится на этапе закрытого тестирования и станет доступна для всех в ближайшее время.",
            PAYPASS_BAD_EMAIL: "Некорректный email",
            FAIL_OPEN_WALLET: "Произошла ошибка при открытии кошелька, повторите операцию позже",
            WALLET_FOR_CURRENCY_ALREADY_EXISTS: "Кошелек с такой валютой уже создан. Попробуйте войти по другой карте.",
            INSUFFICIENT_FUNDS: "Недостаточно средств",
            DP_CHECK_ERROR: "К сожалению, в данный момент заказ именной карты недоступен. Попробуйте позже",
            DP_ERROR: "К сожалению, в данный момент заказ именной карты недоступен. Попробуйте позже",
            CHECK_LIMIT_ERROR: "Похоже, что-то пошло не так. Мы уже разбираемся, в чем дело. Попробуйте повторить операцию позже.",
            RESERVE_EAN_ERROR: "К сожалению, в данный момент заказ именной карты недоступен. Попробуйте позже",
            DP_UNKNOWN_CARD: "Перезаказ карты станет доступным через несколько минут. Попробуйте повторить операцию позднее",
            HOUSE_IS_EMPTY: "Введите номер дома",
            POSTCODE_IS_EMPTY: "Введите индекс",
            POSTCODE_IS_WRONG: "Введите корректный индекс",
            STREET_IS_EMPTY: "Введите название улицы или отметьте, что в адресе доставки отсутствует наименование улицы",
            PPS_REPLACE_CODE_WRONG: "Указан неверный 13-значный штрих-код карты",
            EMAIL_TOO_LONG: "Длина адреса email не должна превышать 255 символов",
            SENDING_EMAIL_BAD_EMAIL: "Введите, пожалуйста, корректный e-mail",
            FAILED_TO_PREFILL_EDIT_FORM: "Эта ссылка предназначена для открытия только из Ленты операций.",
            CONSUMER_IS_NOT_IN_TRIALRUN: "Данный функционал временно недоступен. Попробуйте войти по штрих-коду карты.",
            TEMPLATE_TO_FIND_NO_FOUND: "Данный шаблон был удален",
            CHECK_RECIPIENT_CARD_ERROR: "Введите корректное имя и фамилию получателя, как на карте.",
            NO_REPLACE_FOR_CARD: "Карта недействительна, т.к. еще никому не принадлежит. Вход по карте невозможен.",
            AUTH_TEMP_PASSWORD_EXPIRED: "Срок действия вашего пароля истек. Нажмите на кнопку «Получить пароль» и измените его.",
            PRE_ORDER_FOR_WALLET_ALREADY_EXISTS: "Предзаказ карты на этот кошелек уже оформлен",
            WALLET_ID_NOT_FOUND_1: "У вас нет открытых валютных кошельков. Чтобы создать кошелек, нажмите «Валютный кошелек».",
            WALLET_NOT_FOUND_2: "У вас нет открытых валютных кошельков. Чтобы создать кошелек, нажмите «Валютный кошелек».",
            REQUIRED_SECRET_ERROR: "Введите пароль",
            PHONE_CANNOT_BE_REGISTERED: "Регистрация карты с данным номером телефона невозможна. Выберите карту, привязанную к другому номеру телефона",
            TRANSFER_DISABLED: "Перевод невозможен, поскольку абонент запретил переводы по номеру телефона. Попробуйте перевести по номеру штрих-кода карты.",
            FORM_NOT_AVAILABLE: "Форма выбранной операции недоступна. Попробуйте повторить опреацию позже.",
            SECRET_WORD_LIMIT_REACHED: "Вы превысили число запросов кодового слова через <%= smsAbbr %>. Для получения обратитесь в информационный центр.",
            SECRET_WORD_DEFAULT_ERROR: "Что-то пошло не так, мы уже разбираемся в чем дело. Для получения кодового слова обратитесь в информационный центр.",
            REQUIRED_ERROR: "Введите значение",
            REQUIRED_EMAIL_ERROR: "Необходимо указать адрес электронной почты",
            MIN_LENGTH_ERROR: 'Минимальная длина <%= minLength %> <%= plural(minLength, {one: "символ", few: "символа", many: "символов"}) %>',
            MAX_LENGTH_ERROR: 'Максимальная длина <%= maxLength %> <%= plural(maxLength, {one: "символ", few: "символа", many: "символов"}) %>',
            MIN_VALUE_ERROR: "Миниальное значение <%= minValue %>",
            MAX_VALUE_ERROR: "Максимальное значение <%= maxValue %>",
            PATTERN_ERROR: "Укажите корректное значение",
            PATTERN_EMAIL_ERROR: "Проверьте, правильно ли вы ввели e-mail, или введите другой",
            FEEDBACK_EMAIL_ERROR: "Необходимо указать адрес электронной почты",
            REQUIRED_AMOUNT_ERROR: "Введите сумму",
            FULL_FILL_ERROR: "Введите значение полностью",
            REQUIRED_EAN_ERROR: "Введите номер штрих-кода карты",
            REQUIRED_PHONE_ERROR: "Введите номер телефона",
            PATTERN_EAN_ERROR: "Введите корректный номер штрих-кода карты",
            PATTERN_PHONE_ERROR: "Введите корректный номер телефона",
            REQUIRED_PRINCIPAL_ERROR: "Введите номер штрих-кода карты",
            PATTERN_PRINCIPAL_ERROR: "Введите корректный номер штрих-кода карты",
            CANNOT_FIND_CARD_BY_PHONE_NUM: "Проверьте правильность введенных данных и попробуйте войти повторно.",
            AUTH_BY_PHONE_NUM_FORBIDDEN: "Вход по номеру телефона отключен. Используйте номер <nobr>штрих-кода</nobr> карты для входа в интернет-банк.",
            DIFFERENT_CONSUMERS_FOR_AUTH_BY_PHONE_NUM: "Вход по номеру телефона отключен. Используйте номер <nobr>штрих-кода</nobr> карты для входа в интернет-банк.",
            MANY_CARD_FOR_AUTH_BY_PHONE_NUM: "Вы ни разу не входили ни по одной из ваших карт. Введите номер <nobr>штрих-кода</nobr> вашей карты и следуйте инструкциям на экране.",
            FAILED_GET_CARDS_BY_PHONE_FROM_DP: "Вход по номеру телефона недоступен. Используйте номер <nobr>штрих-кода</nobr> карты для входа в интернет-банк.",
            REQUIRED_DATE_ERROR: "Введите дату",
            INVALID_DATE_ERROR: "Введите корректную дату",
            SIMPLE_PASSWORD: "Пароль слишком прост",
            TOO_LONG_COMMENT: "Введен слишком длинный комментарий. Введите не более 24 символов",
            REQUIRED_COUNTRY_ERROR: "Введите название страны",
            AUTH_LOCKED_PERMANENT: "Вход в&nbsp;интернет-банк невозможен, так как ваша карта заблокирована. За&nbsp;помощью обратитесь в&nbsp;<%= supportCenterBanner %>.",
            DP_LOCKED_PERMANENT: "Вход в&nbsp;интернет-банк невозможен, так как ваша карта заблокирована. Возможно, она была заменена на&nbsp;новую карту. Пожалуйста, обратитесь в&nbsp;<%= supportCenterBanner %>, если у&nbsp;вас есть какие-либо вопросы.",
            AUTH_BY_BIRTHDAY_FAILED: "Вы&nbsp;ввели неправильно номер штрих-кода карты или дату рождения. Если вы&nbsp;уверены, что ввели верные данные, обратитесь в&nbsp;<%= supportCenterBanner %>.",
            EXCEEDED_ATTEMPTS_LIMIT: "Вы&nbsp;многократно ввели неправильный код активации, новая карта заблокирована. За&nbsp;помощью обратитесь в&nbsp;<%= supportCenterBanner %>.",
            CANNOT_CHANGE_UPC1_CARD_STATUS: "В данный момент вы можете подтвердить привязку или удалить карту только в интернет-банке на <%= mainUrl %>.",
            MPI_REG_CARD_LIMIT_EXCEEDED: "Данная карта не может быть добавлена, т.к. превышено количество карт <%= productName %>, которые могут пополняться с этой карты",
            REACHY_CARD_LIMIT_EXCEED: "Данная карта не может быть добавлена, т.к. превышено количество карт <%= productName %>, которые могут пополняться с этой карты",
            CARD_IS_NOT_ACTIVE: "Карта была заблокирована. Обратитесь, пожалуйста, в&nbsp;<%= supportCenterBanner %>",
            CARD_IS_ARCHIVED: "Вход в интернет-банк невозможен, так как договор по данной карте расторгнут. Пожалуйста, обратитесь в&nbsp;<%= supportCenterBanner %>, если у вас есть какие-либо вопросы.",
            WALLET_CLOSED: "Вход в&nbsp;интернет-банк невозможен, так как ваша карта заблокирована. За&nbsp;помощью обратитесь в&nbsp;<%= supportCenterBanner %>.",
            TERRORIST: "К сожалению, в данный момент заказ именной карты недоступен. <br>Пожалуйста, обратитесь в <%= supportCenterBanner %> (понадобится назвать кодовое слово вашей карты <%= productName %>).",
            PPS_EXCEEDED_ATTEMPTS_LIMIT: "Количество попыток активации карты превышено. Обратитесь в <%= supportCenterBanner %> (понадобится назвать кодовое слово вашей текущей карты <%= productName %>)",
            CARD_PAN_IS_EMPTY: "Введите номер карты",
            INCORRECT_CARD_PAN: "Введите корректный номер карты",
            INCORRECT_CARD_PAN_LENGTH: "Номер карты должен содержать от 16 до 19 цифр",
            TOO_MANY_REQUESTS_SEND_EMAIL: "Письмо на указанный адрес уже отправлено. Проверьте свою электронную почту",
            SEND_CONFIRM_CODE_ERROR: "Что-то пошло не так. Попробуйте отправить письмо повторно",
            EMAIL_ALREADY_CONFIRMED: "Данный e-mail уже подтвержден",
            INVALID_EMAIL: "Введен неверный e-mail",
            NOT_AVAILABLE_OTHER_CONSUMER: "<p>Другой клиент зарегистрировал карту <%= productName %> на ваш номер телефона.</p><p>Чтобы пользователи могли отправлять вам переводы по номеру телефона, необходимо либо привязать к вашей карте другой номер телефона, либо попросить второго клиента привязать все его карты к другому номеру телефона.</p>",
            NOT_AVAILABLE_CARD_NOT_FOUND: "<p>Ни одной разрешенной карты для получения переводов не найдено.</p><p>Обратитесь в <%= supportCenterBanner %> для выяснения причин.</p>",
            SENDING_ERROR: "Информация о настройках получения переводов временно недоступна. Попробуйте повторить операцию позже.",
            UNAVAILABLE: "<p>Другой клиент зарегистрировал карту <%= productName %> на ваш номер телефона.</p><p>Для того, чтобы войти в интернет-банк по данному номеру, необходимо либо привязать к вашей карте другой номер телефона, либо попросить второго клиента отключить вход по номеру телефона или привязать все его карты к другому номеру телефона.</p>",
            AUTH_BY_PHONE_NUM_SETTING_UPDATE_UNAVAILABLE: "<p>В данный момент настройка входа по номеру телефона уже выполняется. Попробуйте позже.</p>",
            LIMIT_MAX_VALUE: "Максимальный лимит - <%= maxValue %>₽",
            AUTH_BY_PHONE_NUM_SETTING_UPDATE_CARD_WITHOUT_PASSWORD: "Вы выбрали для входа по номеру телефона карту без пароля. Пожалуйста, создайте пароль для этой карты и попробуйте еще раз.",
            PAN_REQUIRED: "Заполните номер карты",
            PAN_WRONG: "Некорректный номер карты",
            CVV2_REQUIRED: "Укажите CVV2/CVC2 код",
            CVV2_WRONG: "Укажите корректный CVV2/CVC2 код",
            EXP_MONTH_REQUIRED: "Заполните срок действия карты (месяц)",
            EXP_MONTH_WRONG: "Укажите корректный срок действия карты (месяц)",
            EXP_YEAR_REQUIRED: "Заполните срок действия карты (год)",
            EXP_YEAR_WRONG: "Укажите корректный срок действия карты (год)",
            AMOUNT_WRONG: "Введите корректную сумму",
            LIMIT_VALUE_NOT_NUMBER: "Введите корректную сумму",
            CARD_EXPIRED: "Не удалось пополнить карту. Срок действия карты, с которой вы пытаетесь пополнить карту <%= config.productName %>, истек. Пожалуйста, произведите пополнение с другой карты.",
            RECHARGE_FAIL: "Не удалось пополнить карту. Попробуйте повторить операцию позднее или обратитесь в Информационный центр.",
            FIRST_RECHARGE_ERROR: "Сума первого пополнения карты должна быть 200 или более рублей. Укажите корректную сумму и повторите попытку.",
            QPAY_LOCKED: "Карта заблокирована. Пожалуйста, обратитесь в Информационный центр.",
            ISSUER_LIMIT_AMOUNT_EXCEEDED: "Превышен лимит вывода средств с выбранной карты. Пожалуйста, выберите другую карту для пополнения.",
            MERCHANT_LIMIT_AMOUNT_EXCEEDED: "Превышена допустимая сумма пополнения. Попробуйте уменьшить сумму или повторите операцию позже.",
            IPS_UNSPECIFIED_ERROR: "Не удалось пополнить карту. Попробуйте повторить операцию позднее или обратитесь в Информационный центр.",
            IPS_INSUFFICIENT_FUNDS: "На карте недостаточно средств для пополнения",
            IPS_WRONG_CARD_DATA: "Не удалось пополнить карту. Проверьте правильность номера карты, срока действия, CVC2 (CVV2) и повторите попытку.",
            QPAY_FAULT: "При запросе произошла ошибка. Пожалуйста, повторите операцию позднее.",
            QPAY_LIMIT: "Превышен максимальный баланс карты",
            QPAY_LIMIT_MONTH: "Превышен месячный лимит пополнения карт",
            QPAY_CARD_EXPIRED: "Срок действия вашей карты истек. Пожалуйста, обратитесь в Информационный центр.",
            QPAY_INCOMPLETE_DATA: "Чтобы пополнять карту в интернет-банке, необходимо обратиться с паспортом в любую точку обслуживания карты для внесения недостающих данных.",
            QPAY_LIMIT_ONE_OPERATION: "Превышен лимит разового пополнения карты",
            QPAY_LIMIT_MONTH_GENERAL: "Превышен месячный лимит пополнения карты",
            IPS_FOREIGN_CARD: "Пополнение с карты иностранного государства невозможно. Укажите карту российского банка для пополнения.",
            LINK_ALREADY_EXIST: "Данная карта уже зарегистрирована для пополнения",
            COOKIE_ERROR: "Пожалуйста, разрешите использование cookies или воспользуйтесь другим браузером",
            FINISH_STEP_EXECUTE_ERROR: "К сожалению, выбранную карту сейчас заказать невозможно. Пожалуйста, попробуйте позднее.",
            CARD_REGISTER_TO_ANOTHER_CONSUMER: "К сожалению, пополнение с данной карты невозможно",
            NOT_BEELINE_PHONE_NUMBER: "Для того, чтобы оплачивать свой мобильный телефон бонусами, к текущей карте необходимо привязать номер телефона «Билайн». Вы можете сделать это, обратившись в <%= supportCenterBanner %>, или в ближайший <a href=\"<%= routes.support.getPopupUrl({ tabId: 'contacts' }) %>\">офис «Билайн»</a>.",
            UNSUPPORTED_TYPE: "Выписка для выбранного кошелька не может быть создана",
            ANOTHER_STATEMENT_EXISTS: "Выписка по выбранному кошельку уже в работе. Дождитесь создания отчета.",
            WRONG_PERIOD: "Выписка за выбранный период не может быть создана. Выберите другой период.",
            GENERATION_ERROR: "Создание выписки не удалось. Повторите запрос позднее.",
            SELECT_LOADED_FILE_ERROR: "Выберите файлы для загрузки",
            MAX_SIZE_LOADED_FILE_ERROR: "Максимальный размер загружаемых файлов не должен превышать 10&thinsp;Мб.",
            UNAVAILABLE_TYPE: "Можно загружать только изображения и pdf-документы",
            FILE_SIZE_EXCEEDED: "Максимальный размер загружаемых файлов не должен превышать 10&thinsp;Мб.",
            BROKEN_FILE: "Загружаемый файл поврежден. Проверьте целостность файла и повторите попытку.",
            EMAIL_SENDING_FAILED: "Не получилось отправить заявление. Попробуйте повторить операцию позднее.",
            INVALID_PASSPORT: "Невозможно активировать карту, ваши паспортные данные устарели. Пожалуйста, обновите паспортные данные в&nbsp;любом офисе <%= productName %>.",
            CONSUMER_NOT_FULLY_IDENTIFIED: "Чтобы совершать переводы по реквизитам, вам необходимо обновить свои данные владельца карты.<br>Обратитесь в любой офис <%= productName %> c вашей картой и паспортом.<br>Сотрудник офиса внесет все недостающие данные, после чего вы сможете пользоваться всеми возможностями интернет-банка.",
            PASSPORT_EXPIRED: "Все операции по карте в интернет-банке заблокированы. Обновите ваши паспортные данные в ближайшем офисе <%= productName %>",
            HAS_ARRESTED_CARD: "Выпуск именной карты невозможен, т.к. одна из ваших карт заблокирована. Чтобы разблокировать карту, следуйте указаниям из СМС-сообщения, которое было выслано в момент блокировки карты, либо обратитесь в Информационный центр по телефону <%= supportPhone %>.",
            WRONG_CABINET: "Выполнение запрошенной операции невозможно",
            SBP_EXCEEDED_INCORRECT_ATTEMPTS_LIMIT: "Код введен неверно, повторите попытку регистрации",
            SERVICE_START_FORM_REJECTED: "Выполнение операции заблокировано в соответствии с вашим заявлением.",
            FAILED_TO_PREFILL_FORWARDING_FORM: "Не получается открыть форму возврата перевода. Попробуйте выполнить перевод по номеру телефона или номеру штрих-кода карты.",
            YMAPS_ERROR: "При загрузке карты произошла ошибка",
            YMAPS_CANNOT_SHOW_ALL_OFFICES_IN_AREA: "Отображаются не все точки. Приблизьте карту, чтобы увидеть больше офисов",
            YMAPS_NO_OFFICES_IN_AREA: "Мы не нашли офисы в этой области. Измените масштаб карты",
            YMAPS_CANNOT_SHOW_ALL_BANKS_IN_AREA: "Отображаются не все точки. Приблизьте карту, чтобы увидеть больше отделений банков",
            YMAPS_NO_BANKS_IN_AREA: "Мы не нашли отделения банков в этой области. Измените масштаб карты",
    };
    if(errors[code])
    	return errors[code];
    return code;
}