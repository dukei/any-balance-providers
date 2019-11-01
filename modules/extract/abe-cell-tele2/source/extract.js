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

var baseurl = "https://tele2.ru/";
var baseurlLogin = 'https://login.tele2.ru/ssotele2/';
var baseurlLoginIndex, baseurlLoginPost;
var g_operatorName = 'Теле2';

function login() {
	var _baseurlLoginIndex = baseurlLoginIndex || baseurlLogin + 'wap/auth/';
	var _baseurlLoginPost = baseurlLoginPost || baseurlLogin + 'wap/auth/submitLoginAndPassword';

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
                throw new AnyBalance.Error(`Новый личный кабинет ${g_operatorName} временно недоступен. Попробуйте позже.`, true);
            }
        }
        return html;
    }

	var prefs = AnyBalance.getPreferences();

	checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите логин - номера телефона из 10 цифр! Например, 9771234567');
	//checkEmpty(prefs.password, 'Введите пароль!');

	AnyBalance.setDefaultCharset('utf-8');

	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

	if (!/\w+\/"number":"\d+"/i.test(html)) {
        if(!prefs.password){
            html = enterBySms();
        }else {
            html = AnyBalance.requestGet(_baseurlLoginIndex + '?serviceId=301', g_headers);
            if (!html || AnyBalance.getLastStatusCode() > 400) {
                AnyBalance.trace(html);
                throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
            }

            var form = getElement(html, /<form[^>]+(?:authForm|submitLoginAndPassword)/i);
            if (!form) {
                AnyBalance.trace(html);
                throw new AnyBalance.Error('Не удалось найти форму входа, сайт изменен?');
            }
			var params = AB.createFormParams(form, function(params, str, name, value) {
				if (/number|msisdn/i.test(name)) {
					return prefs.login;
				} else if (name == 'password') {
					return prefs.password;
				}

				return value;
			});


            html = AnyBalance.requestPost(_baseurlLoginPost, params, addHeaders({Referer: baseurlLoginIndex}));
        }

        html = retryToEnter(html);
	}else{
        AnyBalance.trace('Уже в кабинете. Используем текущую сессию');
    }

	if (!/\w+\/logout/i.test(html)) {
		if (/<input[^>]+id\s*=\s*"smsCode"/i.test(html)) throw new AnyBalance.Error(
			`У вас настроена двухфакторная авторизация с вводом SMS кода при входе в личный кабинет ${g_operatorName}. Для работы провайдера требуется запрос СМС кода для входа в ЛК отключить. Инструкцию по отключению см. в описании провайдера.`,
			null, true);
		var error = getElements(html, /<(?:section|div)[^>]+class="[^"]*\berror\b/gi, [/Осталось:/ig, '', replaceTagsAndSpaces]).join('\n') || '';
		if (error)
            throw new AnyBalance.Error(error, null, /парол|не найден/i.test(error));

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

function enterBySms(){
    var prefs = AnyBalance.getPreferences();

    var html = AnyBalance.requestGet(baseurlLogin + 'wap/auth/ussd', g_headers);
    if (!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    var token = getParam(html, [
    	/<input[^>]+value="([^"]+)"[^>]*name="_csrf"/i,
    	/<input[^>]+name="_csrf"[^>]*value="([^"]+)"/i], replaceTagsAndSpaces);

    if (!token) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось найти форму входа при входе через SMS, сайт изменен?');
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
                html = AnyBalance.requestGet(baseurlLogin + 'wap/auth?serviceId=301', g_headers);
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
                    throw new AnyBalance.Error(`Этот номер не поддерживается личным кабинетом ${g_operatorName}. Убедитесь, что это действительно номер ${g_operatorName}.`, null, true);
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
    	token = getParam(html, [
    		/<input[^>]+value="([^"]+)"[^>]*name="_csrf"/i,
    		/<input[^>]+name="_csrf"[^>]*value="([^"]+)"/i], replaceTagsAndSpaces);

        var code = AnyBalance.retrieveCode(`Вам отправлено SMS-сообщение с кодом для входа в личный кабинет ${g_operatorName}. Введите код из SMS`, null, {inputType: 'number'});
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

function getSubscriberId() {
	var prefs = AnyBalance.getPreferences();
    var subsid = '7' + replaceAll(prefs.login, [/\D/g, '', /.*(\d{10})$/, '$1']);
    return subsid;
}

function processBalance(html, result){
    if(!AnyBalance.isAvailable('balance', 'tariff'))
        return;

    var subsid = getSubscriberId();

    AnyBalance.trace('Получаем баланс');

    var maxTries = 3;

    if(AnyBalance.isAvailable('balance')){
        for(var i = 0; i < maxTries; i++) {
            try {
                AnyBalance.trace('Пытаемся получить баланс, попытка: ' + (i+1));
                html = AnyBalance.requestGet(baseurl + 'api/subscribers/' + subsid + '/balance', addHeaders({
                	Accept: '*/*',
                	'X-Requested-With': 'XMLHttpRequest',
                	Referer: baseurl
                }));
        
                var json = getJson(html);
        
                getParam(json.data.value, result, 'balance');
        
                AnyBalance.trace('Успешно получили баланс');
                break;
            }
            catch(e) {
                AnyBalance.trace('Не удалось получить баланс, пробуем еще раз...');
            }
        }
    }

    if(AnyBalance.isAvailable('tariff')){
        for(var i = 0; i < maxTries; i++) {
            try {
                AnyBalance.trace('Пытаемся получить тариф, попытка: ' + (i+1));
                html = AnyBalance.requestGet(baseurl + 'api/subscribers/' + subsid + '/tariff', addHeaders({
                	Accept: '*/*',
                	'X-Requested-With': 'XMLHttpRequest',
                	Referer: baseurl
                }));
        
                var json = getJson(html);
        
                getParam(json.data.frontName, result, 'tariff');
        
                AnyBalance.trace('Успешно получили тариф');
                break;
            }
            catch(e) {
                AnyBalance.trace('Не удалось получить тариф, пробуем еще раз...');
            }
        }
    }

}

function processRemainders(html, result){
    if (!AnyBalance.isAvailable('remainders'))
        return;

    AnyBalance.trace('Получаем остатки услуг');
    var siteId = getParam(html, /"siteId":"([^"]*)/i);
    if(!siteId){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось определить регион. Сайт изменен?');
    } 

    try {
        if(!result.remainders)
            result.remainders = {};

        var subsid = getSubscriberId();

        AnyBalance.trace("Searching for resources left");
        html = AnyBalance.requestGet(baseurl + "api/subscribers/" + subsid + '/' + siteId + '/rests', addHeaders({
        	Accept: '*/*',
        	'X-Requested-With': 'XMLHttpRequest',
        	Referer: baseurl
        }));

        AnyBalance.trace('Got discounts: ' + html);
        json = JSON.parse(html);
        for (var i = 0; i<json.data.rests.length; ++i) {
            var discount = json.data.rests[i];
            getDiscount(result.remainders, discount);
        }
        
    } catch(e) {
        AnyBalance.trace("Не удалось получить данные об остатках пакетов и услуг, попробуйте позже " + e);
    }
}

function getDiscount(result, discount) {
    var name = discount.service.name;
    var units = discount.uom;
    AnyBalance.trace('Найден дискаунт: ' + name + ' (' + units + ')');

    if(discount.limit === 0)
    	return; //Empty discount

	getParam(discount.endDay, result, 'remainders.endDate', null, null, parseDateISO);
	
    if (/min/i.test(units)) {
        //Минуты
        sumParam(Math.round(discount.remain*100)/100, result, 'remainders.min_left', null, null, null, aggregate_sum);
        sumParam(Math.round((discount.limit - discount.remain)*100/100), result, 'remainders.min_used', null, null, null, aggregate_sum);
        sumParam(discount.endDay || undefined, result, 'remainders.min_till', null, null, parseDateISO, aggregate_min);
    } else if (/[кмгkmg][bб]/i.test(units)) {
        //трафик
        var left = parseTraffic(discount.remain + discount.uom);
        var total = parseTraffic(discount.limit + discount.uom);
        sumParam(left, result, 'remainders.traffic_left', null, null, null, aggregate_sum);
        sumParam(total - left, result, 'remainders.traffic_used', null, null, null, aggregate_sum);
        sumParam(discount.endDay || undefined, result, 'remainders.traffic_till', null, null, parseDateISO, aggregate_min);
    } else if (/pcs/i.test(units)) {
        //СМС/ММС
        sumParam(discount.remain, result, 'remainders.sms_left', null, null, null, aggregate_sum);
        sumParam(discount.limit - discount.remain, result, 'remainders.sms_used', null, null, null, aggregate_sum);
        sumParam(discount.endDay || undefined, result, 'remainders.sms_till', null, null, parseDateISO, aggregate_min);
    } else {
        AnyBalance.trace("Неизвестный дискаунт: " + JSON.stringify(discount));
    }
}

function processPayments(html, result){
    if (!AnyBalance.isAvailable('payments'))
        return;

    AnyBalance.trace("Searching for payments");

    var subsid = getSubscriberId();
	
	try {
		html = AnyBalance.requestGet(baseurl + "api/subscribers/" + subsid + "/payments?fromDate=" 
		    + getFormattedDate({format: 'YYYY-MM-DD', offsetMonth:3}) + "T00%3A00%3A00%2B03%3A00&toDate="
		    + getFormattedDate({format: 'YYYY-MM-DD'}) + "T23%3A59%3A59%2B03%3A00", g_headers);
		
		var json = getJson(html);
	} catch (e) {}
	
	if(!json || !json.data) {
		AnyBalance.trace(html);
		AnyBalance.trace('Не удалось получить последние платежи, может их просто нет?');
		return;
	}
	
	AnyBalance.trace('History json: ' + JSON.stringify(json));
    result.payments = [];
	
    for (var i = 0; i < json.data.length; ++i) {
        var pmnt = json.data[i];
        var p = {};

        getParam(pmnt.sum.amount, p, 'payments.sum', null, null, parseBalanceSilent);
		getParam(pmnt.type, p, 'payments.descr');
		
        getParam(pmnt.payDate, p, 'payments.date', null, null, parseDateISO);

        result.payments.push(p);
    }
}

function processInfo(html, result){
    if(!AnyBalance.isAvailable('info'))
        return;

    var subsid = getSubscriberId();

    var info = result.info = {};

    html = AnyBalance.requestGet(baseurl + "api/subscribers/" + subsid + '/profile', addHeaders({
    	Accept: '*/*',
    	'X-Requested-With': 'XMLHttpRequest',
    	Referer: baseurl
    }));

    var json = getJson(html);
    getParam(json.data.fullName, info, "info.fio", /<div[^>]+class="user-name"[^>]*>([\s\S]*?)(?:<\/div>|<a)/i, replaceTagsAndSpaces, capitalFirstLetters);
    getParam(subsid, info, "info.mphone");
    getParam(json.data.address.city + ' ' + json.data.address.street + ' ' + json.data.address.house, info, "info.address");
    getParam(json.data.email || undefined, info, "info.email");
}
