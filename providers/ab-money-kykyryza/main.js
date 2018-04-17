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
		throw new AnyBalance.Error(getErrorDescription(json.status), null, /AUTH|CANNOT_FIND_SUBJECT/i.test(json.status));
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
	json = callApi('authentication/authenticate', null, {"principal":prefs.login,"secret":prefs.password,"type":"AUTO"});
	
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
        RESET_AUTH_LOCKED_TEMPORARY: 'Вы&nbsp;три раза ввели неверные данные, доступ в&nbsp;интернет-банк временно заблокирован. Повторно ввести дату рождения можно через <%= date(time, "mm:ss") %>.',
        PRINCIPAL_IS_EMPTY: "Введите номер штрих-кода карты",
        AUTH_WRONG: "Проверьте правильность введенных данных и попробуйте войти повторно.",
        CANNOT_FOUND_AUTHENTICATION_PROVIDER: "Введите номер штрих-кода карты",
        CONSUMER_INITIALIZATION_HAS_ALREADY_SCHEDULED: "Подождите, идет загрузка данных",
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
        NOT_APPROVED: "Интернет-банк работает в&nbsp;тестовом режиме. Доступ в&nbsp;интернет-банк ограничен.",
        DENIED: "Доступ в&nbsp;интернет-банк для вашей карты запрещен",
        UNAUTHORIZED_ACCESS_FROM_THIS_IP: "Сеанс был завершен. Пожалуйста, зайдите еще раз, чтобы продолжить работу.",
        PASSWORD_IS_EMPTY: "Введите код подтверждения",
        WRONG_DOCUMENT_OR_PASSWORD: "Неверный код подтверждения",
        WRONG_MERGE_PASSWORD: "Неверный код подтверждения",
        EXPIRED: "Истек срок действия, запросите код еще раз",
        EMPTY_PAY_TEMPLATE_AMOUNT: "Введите сумму",
        RECHARGE_DP_UNAVAILABLE: "Сервис временно недоступен. Пожалуйста, повторите попытку позже.",
        SERVICE_NOT_AVAILABLE: "Сервис временно недоступен. Пожалуйста, повторите попытку позже.",
        MPI_REG_CARD_FAIL: "При регистрации карты произошла ошибка, пожалуйста, повторите попытку позже.",
        MPI_CARD_CONFIRM: "При подтверждении карты произошла ошибка, пожалуйста, повторите попытку позже.",
        MPI_FUNDING_ERR: "При пополнении карты произошла ошибка, пожалуйста, повторите попытку позже.",
        MPI_CARD_DELETE: "При удалении карты произошла ошибка, пожалуйста, повторите попытку позже.",
        MPI_FUNDING_ERR_CARD_DATE_EXPIRED: "Срок действия карты истек. Выберите действующую карту для пополнения.",
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
        CONSUMER_IS_NOT_IN_TRIALRUN: "Благодарим вас за проявленный интерес! Данный функционал еще недоступен, т.к. находится на стадии тестирования.",
        TEMPLATE_TO_FIND_NO_FOUND: "Данный шаблон был удален",
        CHECK_RECIPIENT_CARD_ERROR: "Введите корректное имя и фамилию получателя, как на карте.",
        NO_REPLACE_FOR_CARD: "Карта недействительна, т.к. еще никому не принадлежит. Вход по карте невозможен.",
        AUTH_TEMP_PASSWORD_EXPIRED: "Срок действия вашего пароля истек. Нажмите на кнопку «Получить пароль» и измените его.",
        PRE_ORDER_FOR_WALLET_ALREADY_EXISTS: "Предзаказ карты на этот кошелек уже оформлен",
        WALLET_ID_NOT_FOUND_1: "У вас нет открытых валютных кошельков. Чтобы создать кошелек, нажмите «Валютный кошелек».",
        WALLET_NOT_FOUND_2: "У вас нет открытых валютных кошельков. Чтобы создать кошелек, нажмите «Валютный кошелек».",
        REQUIRED_SECRET_ERROR: "Введите пароль",
        YMAPS_ERROR: "При загрузке карты произошла ошибка",
        TRANSFER_DISABLED: "Перевод невозможен, поскольку абонент запретил переводы по номеру телефона. Попробуйте перевести по номеру штрих-кода карты.",
        REQUIRED_ERROR: "Введите значение",
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
        PATTERN_EAN_ERROR: "Введите корректный номер штрих-кода карты",
        REQUIRED_PRINCIPAL_ERROR: "Введите номер телефона или штрих-кода карты",
        PATTERN_PRINCIPAL_ERROR: "Введите корректный номер телефона или штрих-кода карты",
        CANNOT_FIND_CARD_BY_PHONE_NUM: "Проверьте правильность введенных данных и попробуйте войти повторно.",
        AUTH_BY_PHONE_NUM_FORBIDDEN: "Вход по номеру телефона отключен. Используйте номер <nobr>штрих-кода</nobr> карты для входа в интернет-банк.",
        DIFFERENT_CONSUMERS_FOR_AUTH_BY_PHONE_NUM: "Вход по номеру телефона отключен. Используйте номер <nobr>штрих-кода</nobr> карты для входа в интернет-банк.",
        MANY_CARD_FOR_AUTH_BY_PHONE_NUM: "Вы ни разу не входили ни по одной из ваших карт. Введите номер <nobr>штрих-кода</nobr> вашей карты и следуйте инструкциям на экране.",
        FAILED_GET_CARDS_BY_PHONE_FROM_DP: "Вход по номеру телефона недоступен. Используйте номер <nobr>штрих-кода</nobr> карты для входа в интернет-банк.",
        REQUIRED_DATE_ERROR: "Введите дату",
        INVALID_DATE_ERROR: "Введите корректную дату",
        SIMPLE_PASSWORD: "Пароль слишком прост",
        TOO_LONG_COMMENT: "Введен слишком длинный комментарий. Введите не более 24 символов",
        AUTH_LOCKED_PERMANENT: "Вход в&nbsp;интернет-банк невозможен, так как ваша карта заблокирована. За&nbsp;помощью обратитесь в&nbsp;<%= config.supportTemplate %>.",
        DP_LOCKED_PERMANENT: "Вход в&nbsp;интернет-банк невозможен, так как ваша карта заблокирована. Возможно, она была заменена на&nbsp;новую карту. Пожалуйста, обратитесь в&nbsp;<%= config.supportTemplate %>, если у&nbsp;вас есть какие-либо вопросы.",
        EAN_OUT_OF_RANGE: "Номер штрих-кода карты должен начинаться с <%= config.eanPrefix %>",
        AUTH_BY_BIRTHDAY_FAILED: "Вы&nbsp;ввели неправильно номер штрих-кода карты или дату рождения. Если вы&nbsp;уверены, что ввели верные данные, обратитесь в&nbsp;<%= config.supportTemplate %>.",
        EXCEEDED_ATTEMPTS_LIMIT: "Вы&nbsp;многократно ввели неправильный код активации, новая карта заблокирована. За&nbsp;помощью обратитесь в&nbsp;<%= config.supportTemplate %>.",
        CANNOT_CHANGE_UPC1_CARD_STATUS: "В данный момент вы можете подтвердить привязку или удалить карту только в интернет-банке на <%= config.url %>.",
        MPI_REG_CARD_LIMIT_EXCEEDED: "Данная карта не может быть добавлена, т.к. превышено количество карт <%= config.productName %>, которые могут пополняться с этой карты",
        CARD_IS_NOT_ACTIVE: "Карта была заблокирована. Обратитесь, пожалуйста, в&nbsp;<%= config.supportTemplate %>",
        CARD_IS_ARCHIVED: "Вход в интернет-банк невозможен, так как договор по данной карте расторгнут. Пожалуйста, обратитесь в&nbsp;<%= config.supportTemplate %>, если у вас есть какие-либо вопросы.",
        WALLET_CLOSED: "Вход в&nbsp;интернет-банк невозможен, так как ваша карта заблокирована. За&nbsp;помощью обратитесь в&nbsp;<%= config.supportTemplate %>.",
        TERRORIST: "К сожалению, в данный момент заказ именной карты недоступен. <br>Пожалуйста, обратитесь в <%= config.supportTemplate %> (понадобится назвать кодовое слово вашей карты <%= config.productName %>).",
        PPS_EXCEEDED_ATTEMPTS_LIMIT: "Количество попыток активации карты превышено. Обратитесь в <%= config.supportTemplate %> (понадобится назвать кодовое слово вашей текущей карты <%= config.productName %>)",
        CARD_PAN_IS_EMPTY: "Введите номер карты",
        INCORRECT_CARD_PAN: "Введите корректный номер карты",
        INCORRECT_CARD_PAN_LENGTH: "Номер карты должен содержать от 16 до 19 цифр",
        TOO_MANY_REQUESTS_SEND_EMAIL: "Письмо на указанный адрес уже отправлено. Проверьте свою электронную почту",
        SEND_CONFIRM_CODE_ERROR: "Что-то пошло не так. Попробуйте отправить письмо повторно",
        EMAIL_ALREADY_CONFIRMED: "Данный e-mail уже подтвержден",
        INVALID_EMAIL: "Введен неверный e-mail",
        NOT_AVAILABLE_OTHER_CONSUMER: "<p>Другой клиент зарегистрировал карту <%= config.productName %> на ваш номер телефона.</p><p>Чтобы пользователи могли отправлять вам переводы по номеру телефона, необходимо либо привязать к вашей карте другой номер телефона, либо попросить второго клиента привязать все его карты к другому номеру телефона.</p>",
        NOT_AVAILABLE_CARD_NOT_FOUND: "<p>Ни одной разрешенной карты для получения переводов не найдено.</p><p>Обратитесь в <%= config.supportTemplate %> для выяснения причин.</p>",
        SENDING_ERROR: "Информация о настройках получения переводов временно недоступна. Попробуйте повторить операцию позже.",
        UNAVAILABLE: "<p>Другой клиент зарегистрировал карту <%= config.productName %> на ваш номер телефона.</p><p>Для того, чтобы войти в интернет-банк по данному номеру, необходимо либо привязать к вашей карте другой номер телефона, либо попросить второго клиента отключить вход по номеру телефона или привязать все его карты к другому номеру телефона.</p>",
        AUTH_BY_PHONE_NUM_SETTING_UPDATE_UNAVAILABLE: "<p>В данный момент настройка входа по номеру телефона уже выполняется. Попробуйте позже.</p>",
        LIMIT_MAX_VALUE: "Максимальный лимит - <%= maxValue %>₽",
        AUTH_BY_PHONE_NUM_SETTING_UPDATE_CARD_WITHOUT_PASSWORD: "Вы выбрали для входа по номеру телефона карту без пароля. Пожалуйста, создайте пароль для этой карты и попробуйте еще раз.",
    };
    if(errors[code])
    	return errors[code];
    return code;
}