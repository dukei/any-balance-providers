/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.116 Safari/537.36'
};

var baseurl = "https://my.tele2.ru/";
var baseurlLogin = 'https://login.tele2.ru/ssotele2/';

function login() {
    function retryToEnter(html){
        if (AnyBalance.getLastStatusCode() > 400) {
            // Прежде, чем переходить, надо сохранить ошибку, на всякий
            var error = getElement(html, /<div[^>]+error[^>]*>/i, replaceTagsAndSpaces);

            // Попробуем, иногда помогает :)
            if (AnyBalance.getLastStatusCode() == 503)
                html = AnyBalance.requestGet(baseurl + 'login', g_headers);

            if (AnyBalance.getLastStatusCode() > 400) {
                if (error)
                    throw new AnyBalance.Error('Новый кабинет: ' + error);

                AnyBalance.trace(html);
                throw new AnyBalance.Error('Новый личный кабинет Теле2 временно недоступен. Попробуйте позже.');
            }
        }
        return html;
    }

	var prefs = AnyBalance.getPreferences();

	checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите логин - номера телефона из 10 цифр! Например, 9771234567');
	//checkEmpty(prefs.password, 'Введите пароль!');

	AnyBalance.setDefaultCharset('utf-8');

	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

	if (!/\w+\/logout/i.test(html)) {
        if(!prefs.password){
            html = enterBySms();
        }else {
            html = AnyBalance.requestGet(baseurlLogin + 'wap/auth/', g_headers);
            if (!html || AnyBalance.getLastStatusCode() > 400) {
                AnyBalance.trace(html);
                throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
            }

            var token = getParam(html, null, null, /<input[^>]+value="([^"]+)"[^>]*name="_csrf"/i, replaceTagsAndSpaces);
            if (!token) {
                AnyBalance.trace(html);
                throw new AnyBalance.Error('Не удалось найти форму входа, сайт изменен?');
            }

            html = AnyBalance.requestPost(baseurlLogin + 'wap/auth/submitLoginAndPassword', {
                pNumber: prefs.login,
                password: prefs.password,
                '_csrf': token
            }, g_headers);
        }

        html = retryToEnter(html);
	}else{
        AnyBalance.trace('Уже в кабинете. Используем текущую сессию');
    }

	if (!/\w+\/logout/i.test(html)) {
		if (/<input[^>]+id\s*=\s*"smsCode"/i.test(html)) throw new AnyBalance.Error(
			'У вас настроена двухфакторная авторизация с вводом SMS кода при входе в личный кабинет Теле2. Для работы провайдера требуется запрос СМС кода для входа в ЛК отключить. Инструкцию по отключению см. в описании провайдера.',
			null, true);
		var error = sumParam(html, null, null, /<(?:div|section)[^>]+class="[^"]*\berror\b[^>]*>([\s\S]*?)(?:<\/section>|<\/div>|<div)/gi, replaceTagsAndSpaces, null, aggregate_join) || '';
		if (error)
            throw new AnyBalance.Error(error, null, /Неверный пароль|не найден/i.test(error));

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

    if(!/<div[^>]+class="user-phone"/i.test(html)) {
        //Довходим в новый кабинет
        html = AnyBalance.requestGet(baseurl + 'login', addHeaders({Referer: baseurl}));
        html = retryToEnter(html);
    }

    __setLoginSuccessful();
	
	return html;
}

/**
 * Входит в старый кабинет
 * (если уже осуществлен вход в новый)
 */
function reenterOld(html){
    var baseurl = "https://old.my.tele2.ru/";

    html = AnyBalance.requestGet(baseurl, g_headers);
    if(/<form[^>]+id="sso-modal-login-form"/i.test(html)){
        //Надо нажать на кнопку "войти"
        var token = getParam(html, null, null, /<input[^>]+name="csrfTokBY"[^>]*value="([^"]*)/i, replaceHtmlEntities);
        html = AnyBalance.requestGet(baseurl + 'public/login_sso?csrfTokBY=' + token, addHeaders({Referer: baseurl}));
    }

    return html;
}

function enterBySms(){
    var prefs = AnyBalance.getPreferences();

    var html = AnyBalance.requestGet(baseurlLogin + 'wap/auth/ussd', g_headers);
    if (!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    var token = getParam(html, null, null, /<input[^>]+value="([^"]+)"[^>]*name="_csrf"/i, replaceTagsAndSpaces);
    if (!token) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось найти форму входа, сайт изменен?');
    }

    var headers = addHeaders({
        'Origin': baseurlLogin.replace(/(.*:\/\/[^\/]+).*/i, '$1'),
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': token,
        'Referer': AnyBalance.getLastUrl()
    });

    html = AnyBalance.requestPost(baseurlLogin + 'wap/auth/ussd?pNumber=' + encodeURIComponent(prefs.login), {}, headers);
    var returnCode = AnyBalance.getLastStatusCode();

    function handleAuthResult() {
        if (returnCode < 400) {
            var json = getJson(html);
            if (json.success) {
                AnyBalance.setCookie('login.tele2.ru', 'AUTH_DATA', json.key);
                html = AnyBalance.requestGet(baseurlLogin + 'wap/auth?serviceId=341', g_headers);
            } else {
                if (json.captchaNeeded) {
                    var image = AnyBalance.requestGet(baseurlLogin + 'wap/auth/captcha?' + new Date().getTime(), g_headers);
                    code = AnyBalance.retrieveCode("Пожалуйста, введите цифры с картинки", image, {inputType: 'number'});
                    var answer = AnyBalance.requestPost(baseurlLogin + 'wap/auth/ussdCaptcha?captchaAnswer=' + encodeURIComponent(code), {}, headers);
                    json = getJson(answer);
                    if (!json.success)
                        throw new AnyBalance.Error('Неверно введены цифры с картинки.');
                    else {
                        html = AnyBalance.requestPost(baseurlLogin + 'wap/auth/ussd?pNumber=' + encodeURIComponent(prefs.login), {}, headers);
                        returnCode = AnyBalance.getLastStatusCode();
                        return true; //Ещё раз запустить handleResult
                    }
                } else if(json.forbiddenBranch){
                    throw new AnyBalance.Error('Этот номер не поддерживается личным кабинетом Теле2. Убедитесь, что это действительно номер Теле2.', null, true);
                } else {
                    AnyBalance.trace(html);
                    throw new AnyBalance.Error('Вход в личный кабинет не подтвержден на телефоне пользователя. Чтобы войти, отправьте 1 в ответ на запрос на телефоне или дождитесь SMS кода и введите его.');
                }
            }
        }
        return false;
    }

    if(handleAuthResult()) //Если возникла капча, то обработку надо повторить.
        handleAuthResult();

    if(returnCode == 504){
        //USSD код не введен, надо запросить смс
        html = AnyBalance.requestGet(baseurlLogin + 'wap/auth/requestSms', addHeaders({Referer: AnyBalance.getLastUrl()}));
        token = getParam(html, null, null, /<input[^>]+value="([^"]+)"[^>]*name="_csrf"/i, replaceTagsAndSpaces);

        var code = AnyBalance.retrieveCode("Вам отправлено SMS-сообщение с кодом для входа в личный кабинет Теле2. Введите код из SMS", null, {inputType: 'number'});
        html = AnyBalance.requestPost(baseurlLogin + 'wap/auth/submitSmsCode', {
            _csrf: token,
            smsCode: code
        }, addHeaders({Referer: AnyBalance.getLastUrl()}));

        if (!/\w+\/logout/i.test(html) && AnyBalance.getLastStatusCode() < 400) {
            var error = getParam(html, null, null, /<section[^>]+class="error"[^>]*>([\s\S]*?)(?:<div|<\/section>)/i, replaceTagsAndSpaces);
            if(error)
                throw new AnyBalance.Error(error);
            AnyBalance.trace(html);
            throw new AnyBalance.Error("Не удалось войти в кабинет после ввода SMS. Сайт изменен?");
        }
    }

    return html;
}

function processBalance(html, result){
    if(!AnyBalance.isAvailable('balance', 'tariff'))
        return;

    AnyBalance.trace('Получаем баланс');

    var maxTries = 3;

    for(var i = 0; i < maxTries; i++) {
        try {
            AnyBalance.trace('Пытаемся получить баланс, попытка: ' + (i+1));
            html = AnyBalance.requestGet(baseurl + 'main/tariffAndBalance', g_headers);

            var json = getJson(html);

            // Иногда приходит пустой тариф
            if(json.currentTariffPlan.name)
                getParam(json.currentTariffPlan.name, result, 'tariff');

            getParam(json.balance.amount, result, 'balance', null, null, parseBalance);

            AnyBalance.trace('Успешно получили баланс');
            break;
        }
        catch(e) {
            AnyBalance.trace('Не удалось получить баланс, пробуем еще раз...');
        }
    }
}

function processRemainders(html, result){
    if (!AnyBalance.isAvailable('remainders'))
        return;

    AnyBalance.trace('Получаем остатки услуг');

    try {
        if(!result.remainders)
            result.remainders = {};

        AnyBalance.trace("Searching for resources left");
        html = AnyBalance.requestGet(baseurl + "main/discounts", g_headers);
        AnyBalance.trace('Got discounts: ' + html);
        json = JSON.parse(html);
        var arr = [json.discountsIncluded, json.discountsNotIncluded/** не ясно, для чего это включено */];
        for (var k = 0; k < arr.length; ++k) {
            var discounts = arr[k];
            for (var i = 0; discounts && i < discounts.length; ++i) {
                var discount = discounts[i];
                if (isArray(discount)) {
                    for (var j = 0; j < discount.length; ++j) {
                        getDiscount(result.remainders, discount[j]);
                    }
                } else {
                    getDiscount(result.remainders, discount);
                }
            }
        }
    } catch(e) {
        AnyBalance.trace("Не удалось получить данные об остатках пакетов и услуг, попробуйте позже " + e);
    }
}

function getDiscount(result, discount) {
    var name = discount.name;
    var units = discount.limitMeasureCode;
    AnyBalance.trace('Найден дискаунт: ' + name + ' (' + units + ')');
	
	getParam(discount.endDateString, result, 'remainders.endDate', null, null, parseDateWordSilent);
	
    if (/мин/i.test(units)) {
        //Минуты
        sumParam(discount.rest.value, result, 'remainders.min_left', null, null, null, aggregate_sum);
        sumParam(discount.limit.value - discount.rest.value, result, 'remainders.min_used', null, null, null, aggregate_sum);
    } else if (/[кмгkmg][bб]/i.test(units)) {
        //трафик
        getParam(discount.rest.value + discount.rest.measure, result, 'remainders.traffic_left', null, null, parseTraffic);
        getParam((discount.limit.value - discount.rest.value) + discount.limit.measure, result, 'remainders.traffic_used', null, null, parseTraffic);
    } else if (/шт|SMS|MMS/i.test(units)) {
        //СМС/ММС
        if (/ммс|mms/i.test(name)) {
            getParam(discount.rest.value, result, 'remainders.mms_left');
            getParam(discount.limit.value - discount.rest.value, result, 'remainders.mms_used');
        } else {
            getParam(discount.rest.value, result, 'remainders.sms_left');
            getParam(discount.limit.value - discount.rest.value, result, 'remainders.sms_used');
        }
    } else {
        AnyBalance.trace("Неизвестный дискаунт: " + JSON.stringify(discount));
    }
}

function processPayments(html, result){
    if (!AnyBalance.isAvailable('payments'))
        return;

    AnyBalance.trace("Searching for payments");
	
	try {
		html = AnyBalance.requestGet(baseurl + "payments/history?filter=LAST_10");
		
		var json = getParam(html, null, null, /JS_DATA\s*=\s*JSON.parse\s*\(('(?:[^\\']+|\\.)*')/, null, function(str) {
			return getJson(safeEval("return " + str))
		});
	} catch (e) {}
	
	if(!json || !json.payments) {
		AnyBalance.trace(html);
		AnyBalance.trace('Не удолось получить последние платежи, может их просто нет?');
		return;
	}
	
	AnyBalance.trace('History json: ' + JSON.stringify(json));
    result.payments = [];
	
    for (var i = 0; i < json.payments.length; ++i) {
        var pmnt = json.payments[i];
        var p = {};

        getParam(pmnt.amount, p, 'payments.sum', null, null, parseBalanceSilent);
		getParam(pmnt.type, p, 'payments.descr');
		
        getParam(pmnt.date, p, 'payments.date', null, null, function (str) {
			// Вчера в 17:09
			if(/Вчера/i.test(str))
				return parseDate(getFormattedDate({offsetDay: 1}));
			// Сегодня в 11:00
			if(/Сегодня/i.test(str))
				return parseDate(getFormattedDate({offsetDay: 0}));
			
			var match = /^(\d+\s+[а-яa-z]+)/i.exec(str) || [];
			return parseDateWordSilent(match[1]);
		});

        result.payments.push(p);
    }
}

function processInfo(html, result){
    if(!AnyBalance.isAvailable('info'))
        return;

    var info = result.info = {};

    getParam(html, info, "info.fio", /<div[^>]+class="user-name"[^>]*>([^]*?)<\/div>/i, replaceTagsAndSpaces, capitalFirstLetters);
    getParam(html, info, "info.mphone", /<div[^>]+class="user-phone"[^>]*>([^]*?)<\/div>/i, replaceTagsAndSpaces);

    if(AnyBalance.isAvailable("info.email", "info.address")){
        html = AnyBalance.requestGet(baseurl + 'account');

        getParam(html, info, "info.phone_model", /Модель телефона:([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
        getParam(html, info, "info.address", /<div[^>]+id="js-view-element-address-view"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        getParam(html, info, "info.email", /<div[^>]+id="js-view-element-email-view"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);

    }
}
