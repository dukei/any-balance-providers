var g_api_headers = {
    'User-Agent': 'MLK Android Phone 1.2.1',
    'Connection': 'Keep-Alive'
};

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36'
};

var api_url = 'https://api.megafon.ru/mlk/';
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

/** API Megafon LK*/
function callAPI(method, url, params, allowerror) {
    var html;
    if(method == 'post') {
        if(typeof(params) == 'string')
            html = AnyBalance.requestPost(api_url + url, params, addHeaders({'Content-Type': 'application/json; charset=utf-8'}, g_api_headers));
        else
            html = AnyBalance.requestPost(api_url + url, params, g_api_headers);
    }else
        html = AnyBalance.requestGet(api_url + url, g_api_headers);

    var json;
    try{
        json = getJson(html);
    }catch(e){
        json = getJsonEval(html);
    }

    if(json.code && !allowerror) {
        throw new AnyBalance.Error('Ошибка вызова API! ' + json.message);
    }
    return json;
}

function megafonLkAPILogin(options){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login && /^\d{10}$/.test(prefs.login), 'Введите 10 цифр номера телефона без пробелов и разделителей в качестве логина!');

    AnyBalance.trace('Пробуем войти через API мобильного приложения...');

    var sessid = AnyBalance.getCookie('JSESSIONID');
    if(sessid) //А то логин ставит secure cookie и из-за этого check в официальном приложении никогда не работает
        AnyBalance.setCookie('api.megafon.ru', 'JSESSIONID', sessid);

    var html = AnyBalance.requestGet('http://api.megafon.ru/mlk/auth/check', g_api_headers);
    if(AnyBalance.getLastStatusCode() >= 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сервер мобильного API временно недоступен.');
    }

    var json = getJson(html);
    if(json.authenticated){
        AnyBalance.trace('Уже авторизованы на номер ' + json.phone);
        if(json.phone != prefs.login){
            AnyBalance.trace('Номер неправильный (надо ' + prefs.login + '), придется авторизоваться заново');
            json.authenticated = false;
        }else {
            AnyBalance.trace('Номер правильный, используем текущую сессию');
        }
    }

    if(!json.authenticated) {
        json = callAPI('post', 'login', {
            login: prefs.login,
            password: prefs.password
        }, true);

        if (json.code) {
            if (json.code == 'a211' && options.allow_captcha) { //Капча
                var capchaImg = AnyBalance.requestGet(api_url + 'auth/captcha', g_api_headers);
                var captcha = AnyBalance.retrieveCode('Мегафон иногда требует подтвердить, что вы не робот. Сейчас как раз такой случай. Если вы введете цифры с картинки, то мы сможем получить какую-то информацию помимо баланса. В противном случае получим только баланс.\n\nВы можете отключить показ капчи совсем или только ночью в настройках провайдера.', capchaImg, {inputType: 'number'});
                json = callAPI('post', 'login', {
                    login: prefs.login,
                    password: prefs.password,
                    captcha: captcha
                });
            }

            if (json.code)
                throw new AnyBalance.Error('Ошибка вызова API! ' + json.message, null, /Неправильный логин\/пароль/i.test(json.message));
        }

        __setLoginSuccessful();
    }
}

function megafonLkAPIDo(options, result) {
    if (AnyBalance.isAvailable('phone', 'balance', 'bonus_balance', 'tariff', 'credit')) {
        json = callAPI('get', 'api/main/info');

        getParam(json.msisdn, result, 'phone', null, replaceNumber);
        getParam(json.originalBalance + '', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
        getParam(json.bonusBalance + '', result, 'bonus_balance', null, replaceTagsAndSpaces, parseBalance);
        getParam((json.balance-json.originalBalance) + '', result, 'credit', null, replaceTagsAndSpaces, parseBalance);

        if (json.ratePlan)
            getParam(json.ratePlan.name, result, 'tariff', null, replaceTagsAndSpaces);
    }

    processRemaindersApi(result);
    processMonthExpensesApi(result);

    processPaymentsApi(result);

    if (AnyBalance.isAvailable('sub_scl')) {
    	try{
            json = callAPI('get', 'api/payments/info');
            
            getParam(json.outcome + '', result, 'sub_scl', null, replaceTagsAndSpaces, parseBalance);
        }catch(e){
            AnyBalance.trace('Ошибка получения информации о звонках: ' + e.message + '\n' + e.stack);
        }
    }

    processInfoApi(result);

    if(AnyBalance.isAvailable('detalization'))
        processDetalizationApi(result);

    if(!options.dontTurnOffSms)
        processSmsTurnOffApi();
}

function processPaymentsApi(result){
    if (AnyBalance.isAvailable('payments')) {
    	try{
            var json = callAPI('get', 'api/payments/history?offset=0&size=10', true);
            
            if(json.payments) {
                result.payments = [];
            
                for (var i = 0; i < json.payments.length; i++) {
                    var pmnt = json.payments[i];
            
                    var p = {};
                    getParam(pmnt.amount, p, 'payments.sum');
                    getParam(pmnt.date, p, 'payments.date', null, null, parseDate);
                    getParam(pmnt.descr, p, 'payments.descr');
            
                    result.payments.push(p);
                }
            }else{
                AnyBalance.trace('Не удалось получить историю платежей: ' + JSON.stringify(json));
            }
        }catch(e){
            AnyBalance.trace('Ошибка получения истории платежей: ' + e.message + '\n' + e.stack);
        }
    }
}

function processMonthExpensesApi(result){
    if (AnyBalance.isAvailable('month_expenses')) {
    	try{
            var json = callAPI('get', 'api/reports/months', true);
            
            if(json.expenseMonths) {
                result.month_expences = [];
            
                for (var i = 0; i < json.expenseMonths.length; i++) {
                    var exp = json.expenseMonths[i];
            
                    var p = {};
                    getParam(exp.amount, p, 'month_expences.sum');
                    getParam(exp.reportDate, p, 'month_expences.date', null, null, parseDate); //MM/yyyy
                    getParam(exp.percent, p, 'month_expences.pct');
            
                    result.month_expences.push(p);
                }
            }else{
                AnyBalance.trace('Не удалось получить историю месячных трат: ' + JSON.stringify(json));
            }
        }catch(e){
            AnyBalance.trace('Ошибка получения истории месячных трат: ' + e.message + '\n' + e.stack);
        }
    }
}

function processRemaindersApi(result){
    if (AnyBalance.isAvailable('remainders')) {
        var json = callAPI('get', 'api/options/remainders');

        var remainders = result.remainders = {};

        var namesProcessed = [];
        //for(var i = 0; i < json.models.length; i++) {
        // Идем с конца, чтобы игнорировать "замерзшие" остатки
        for(var i = json.models.length-1; i >= 0; i--) {
            var model = json.models[i];
            var optionId = (model.remainders && model.remainders[0] && model.remainders[0].optionId);

            // Этот пакет опций мы уже обработали
            if(namesProcessed.indexOf(model.name + optionId) >= 0 && /OPTION/i.test(model.optionsRemaindersType)) {
                AnyBalance.trace('Мы уже обработали пакеты опций из группы ' + model.name);
                AnyBalance.trace(JSON.stringify(model));
                continue;
            }

            if(model.remainders) {
                namesProcessed.push(model.name + optionId);
                for(var z = 0; z < model.remainders.length; z++) {
                    var current = model.remainders[z];
                    var name = current.name;
                    var units = current.unit;

                    // Игнорируем отрицательные значения пакетов
                    if(current.available < 0) {
                        AnyBalance.trace('Игнорируем отрицательные остатки...' + JSON.stringify(current));
                        continue;
                    }

                    // Минуты
                    if(/мин/i.test(units)) {
                        AnyBalance.trace('Parsing minutes...' + JSON.stringify(current));
                        var val = getParam(current.available, null, null, null, replaceTagsAndSpaces, parseBalance);
                        if(/бесплат/i.test(name)) {
                            getParam(current.available, remainders, 'remainders.mins_n_free', null, replaceTagsAndSpaces, parseMinutes);
                        }else if((/\.\s*МегаФон|на мегафон/i.test(name) && !/МТС/i.test(name) && !/стационар/i.test(name))
                            || /внутри сети/i.test(name)) {
                            sumParam(current.available, remainders, 'remainders.mins_net_left', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
                        } else {
                            sumParam(current.available, remainders, 'remainders.mins_left', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
                            sumParam(current.total, remainders, 'remainders.mins_total', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
                        }
                        // Сообщения
                    } else if(/шт|sms|смс|mms|ммс/i.test(units) || (/шт/i.test(units) && /минут/i.test(name))) {
                        if(/mms|ММС/i.test(name)){
                            AnyBalance.trace('Parsing mms...' + JSON.stringify(current));
                            sumParam(current.available, remainders, 'remainders.mms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
                            sumParam(current.total, remainders, 'remainders.mms_total', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
                        }else{
                            AnyBalance.trace('Parsing sms...' + JSON.stringify(current));
                            sumParam(current.available, remainders, 'remainders.sms_left', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
                            sumParam(current.total, remainders, 'remainders.sms_total', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
                        }
                        // Трафик
						// kmgкмгт - удалено, т.к. есть тариa с 25 600 кб у которого название юнитов "Тар. Ед."
                    } else if(/([kmgкмг][бb]?|[бb](?![\wа-я])|байт|byte)/i.test(units)) {
                        AnyBalance.trace('Parsing data...' + JSON.stringify(current));

                        if(/Гигабайт в дорогу/i.test(name)) {
                            getParam(current.available + current.unit, remainders, 'remainders.gb_with_you', null, replaceTagsAndSpaces, parseTraffic);
                        } else {
                            var suffix = '';
                            if(/ноч/i.test(name)) suffix = '_night';
                            var unlim = /^9{7,}$/i.test(current.total); //Безлимитные значения только из девяток состоят
                            var internet_left = getParam(current.available + current.unit, null, null, null, replaceTagsAndSpaces, parseTraffic);
                            var internet_total = getParam(current.total + current.unit, null, null, null, replaceTagsAndSpaces, parseTraffic);
                            if(isset(internet_left) && !unlim)
                                sumParam(internet_left, remainders, 'remainders.internet_left' + suffix, null, null, null, aggregate_sum);
                            if(isset(internet_total) && !unlim)
                                sumParam(internet_total, remainders, 'remainders.internet_total' + suffix, null, null, null, aggregate_sum);
                            if(isset(internet_left) && isset(internet_total))
                                sumParam(internet_total - internet_left, remainders, 'remainders.internet_cur' + suffix, null, null, null, aggregate_sum);

                            if(current.dateTo)
                                sumParam(current.dateTo, remainders, 'remainders.internet_till', null, replaceTagsAndSpaces, parseDate, aggregate_min);
                            else if(current.dateFrom && current.monthly)
                                sumParam(current.dateFrom, remainders, 'remainders.internet_till', null, replaceTagsAndSpaces, function(str) {
                                    var time = parseDate(str);
                                    if(time){
                                        var dt = new Date(time);
                                        time = new Date(dt.getFullYear(), dt.getMonth()+1, dt.getDate(), dt.getHours(), dt.getMinutes(), dt.getSeconds()).getTime();
                                    }
                                    return time;
                                }, aggregate_min);
                        }
                        // Ошибка
                    } else {
                        AnyBalance.trace('Неизвестные единицы измерений: ' + units + ' опция: ' + name + ': '  + JSON.stringify(current));
                    }
                }
            }
        }
    }
}

function processInfoApi(result){
    if(AnyBalance.isAvailable('info')){
        AnyBalance.trace('Получаем инфо');

        var json = callAPI('get', 'api/profile/info');

        var info = result.info = {};

        getParam(json.contractStart, info, 'info.time_start', null, null, parseDate);
        getParam(json.email, info, 'info.email');
        getParam(json.name, info, 'info.fio');
        getParam(json.region.id, info, 'info.region_id');
        getParam(json.region.name, info, 'info.region_name');
    }
}

function processSmsTurnOffApi(){
    try {
        // Проверим включены ли смс-оповещения о входе
        var json = callAPI('get', 'api/profile/info');
        if(json.notifications) {
            AnyBalance.trace('Включено смс оповещение о входе, отключаем...');

            json = callAPI('post', 'api/profile/notifications?status=false');
            AnyBalance.trace('Отключили, проверяем...');
            json = callAPI('get', 'api/profile/info');

            if(!json.notifications)
                AnyBalance.trace('Успешно отключили смс оповещение о входе в кабинет!');
            else
                AnyBalance.trace('Не удалось отключить смс оповещение о входе в кабинет. Свяжитесь с разработчиком.');
        } else {
            AnyBalance.trace('Cмс оповещение о входе в кабинет уже отключено!');
        }
    } catch(e) {
        AnyBalance.trace('Отключение смс не удалось: ' + e.message);
    }
}

