g_geaders = {
    'content-type': 'application/json; charset=utf-8',
    'x-request-origin': 'https://www.privat24.ua',
    'accept-encoding': 'gzip',
    'user-agent': 'okhttp/3.12.1'
}
const apiUrl = 'https://mob2.privat24.ua/api/p24-aos2/';
const periods = {
    '0': ' в день',
    '1': ' в неделю',
    '2': ' в месяц'
}
const valut = v => {
    valuts = {
        UAH: 'грн.',
        USD: '$',
        EUR: '€',
        RUB: 'р.'
    };
    return valuts[v] ? valuts[v] : v
};

function callAPI(cmd, data, params) {
    AnyBalance.trace('cmd=' + cmd);
    cmd += (cmd.includes('?') ? '&' : '?') + 'sid=' + data.sid + '&access_token=' + data.token + '&public_sid=50ff008ded1c585e384a911d39fa12c5d152606b27f3cfc325f8de419ed52306&public_token=ptok_rNmY7_1618_245496_335542';
    if (params)
        var html = AnyBalance.requestPost(apiUrl + cmd, JSON.stringify(params), g_geaders);
    else
        var html = AnyBalance.requestGet(apiUrl + cmd, g_geaders);
    AnyBalance.trace('Server answer:\n' + html);
    let json = getJson(html);
    if (json.status == 'error') throw AnyBalance.Error(json.message, null, true);
    return json.data;
}


function apiNew() {
    let prefs = AnyBalance.getPreferences();
    //AnyBalance.trace(prefs.showCard);
    //if (prefs.showCard) prefs.showCard = parseInt(prefs.showCard);
    //if (prefs.showLimit) prefs.showCard = parseInt(prefs.showLimit);
    //AnyBalance.trace(prefs.showCard);
    prefs.login = '380' + (prefs.login.replace(/[^\d]+/g, '').substr(-9));
    //if (prefs.cardnum) prefs.cardnum=prefs.cardnum.replace(/[^\d]+/g, '');
    let data = {
        token: '',
        sid: '',
        imei: '',
        firstInitTime: 0,
        pt: 0,
        pass: ''
    }
    data.imei = AnyBalance.getData('imei' + prefs.login);
    data.pt = AnyBalance.getData('pt' + prefs.login);
    data.sid = AnyBalance.getData('sid' + prefs.login);
    data.token = AnyBalance.getData('token' + prefs.login);
    data.pass = AnyBalance.getData('pass' + prefs.login);
    if (!data.imei) {
        var g_imei = '35374906******L';
        data.imei = generateImei((prefs.cardnum||'')+prefs.login, g_imei);
    }
    if (!data.firstInitTime) data.firstInitTime = +new Date;
    if (!data.pt) data.pt = generateUUID('24-4-4-4-12');
    if (!data.pass) data.token = '';
    g_geaders['user-agent-mob'] = '{"appVersion":"6.62.00","biometric":false,"brand":"OnePlus","deviceModel":"ONEPLUS A5000|OnePlus","display":"ONEPLUS A5000_23_171031","firstInitTime":"' + data.firstInitTime + '","hardware":"qcom","imeiGenerate":"' + data.imei + '","industrialName":"OnePlus5","isRooted":false,"lang":"' + (prefs.lang | 'ru') + '","lat":"0.0","lng":"0.0","model":"ONEPLUS A5000","modelType":"Tablet","nfcHce":true,"osName":"AOS","osVersion":"7.1.1"}';
    if (data.token) {
        AnyBalance.trace('Найден старый токен. Проверяем...');
        try {
            var json = callAPI('cardslist', data);
            AnyBalance.trace('Токен в порядке');
        } catch (e) {
            AnyBalance.trace(e.message);
            AnyBalance.trace('Токен просрочен. Пробуем восстановить...');
            var html = AnyBalance.requestPost('https://mob2.privat24.ua/api/proxy/reauth/?sid=' + data.sid + '&access_token=' + data.token + '&lang=ru&pt=' + data.pt,
                JSON.stringify({
                    cmd: "show_static_password_form",
                    lat: 0,
                    lon: 0,
                    action: "submit",
                    as_legal_person: false,
                    static_password: data.pass
                }), g_geaders);
            var json = getJson(html);
            if (!json.status || json.status != 'success') {
                AnyBalance.trace('Сессия просрочена. Нужна авторизация.');
                data.token = '';
            } else {
                AnyBalance.trace('Сессия восстановлена успешно');
                data.sid = json.data.sid;
                data.token = json.data.access_token;
                var json = callAPI('cardslist', data);
                AnyBalance.setData('imei' + prefs.login, data.imei);
                AnyBalance.setData('pt' + prefs.login, data.pt);
                AnyBalance.setData('sid' + prefs.login, data.sid);
                AnyBalance.setData('token' + prefs.login, data.token);
                AnyBalance.setData('pass' + prefs.login, data.pass);
                AnyBalance.saveData();
            }

        }
    }
    if (!data.token) {
        loginSite(prefs, data);
        if (!data.token) throw new AnyBalance.Error('Ошибка авторизации: token не получен.');
        var json = callAPI('cardslist', data);
    }


    //PIWE,ACCB,GLMG,CRCU,CLG5,BBCA,BCRC
    var cards = [];
    if (prefs.cardnum) {
        var prefs_cardnum = prefs.cardnum.match(/(\d)+/g);
        prefs_cardnum.forEach(function(el) {
            let card = json.filter(c => endsWith(c.number, el));
            if (card.length > 0) cards.push(card[0]);
        });
        if (!cards || cards.length == 0) {
            var er = 'Карта заканчивающася на ' + prefs.cardnum + ' не найдена';
            AnyBalance.trace(er);
            AnyBalance.trace('Найденные карты:\n' + json.map(c => c.name + '\n' + c.number + '\n').join('\n'));
            throw new AnyBalance.Error(er, null, true);
        }
    } else {
        cards = json.filter(c => !c.hidden);
        if (cards.length > 1) {
            cards = cards.sort((a, b) =>
                ((a.def || 0) == (b.def || 0) ? 0 : (a.def ? -1 : 1)) ||
                (b.limit || 0) - (a.limit || 0) ||
                (a.order || 0) - (b.order || 0) ||
                (a.group || 0) - (b.group || 0)
            )
        }
    }

    var result = {success: true};
    if (cards.length == 1) {
        var card = cards[0];
        result.balance = parseBalance(card.balance);
        result.card_name = card.name;
        result.card_number = card.number;
        result.__tariff = result.card_name;
        result.currency = valut(card.currency);
        result.limit = card.limit;
        if (card.limit) {
            if (!prefs.showLimit || prefs.showLimit == 2)
                result.suflimit = result.currency;
            else if (prefs.showLimit == 0) {
                result.suflimit = result.currency;
                result.balance = result.balance - card.limit;
            } else if (prefs.showLimit == 1) {
                result.balance = result.balance - card.limit;
                result.suflimit = '+' + card.limit + result.currency;
            }

        }

        if (card.payAvailable) {
            if (isAvailable('info')) {
                var json = callAPI('card/getlimits', data, {
                    action: "getCustomLimits",
                    cardId: card.id,
                });
                result.info = '';
                if (json.cashLimit && json.cashLimit.isLimitSet == true)
                    result.info = 'Лимит на снятие наличных:<br>' + json.cashLimit.usedValue + ' ' + valut(json.currencyCard) + periods[json.cashLimit.period];
                if (json.internetLimit && json.internetLimit.isLimitSet == true)
                    result.info += (result.info ? '<br>' : '') + 'Лимит на расчеты в интернет:<br>' + json.internetLimit.usedValue + ' ' + valut(json.currencyCard) + periods[json.internetLimit.period];
                if (!result.info) delete result.info;
            }
            if (isAvailable('statment')) {
                var json = callAPI('statements?shiftToLast=false&action=getStatements&lang=ru&dateFrom=' + getFormattedDate({
                    offsetDay: 3,
                    format: 'DD.MM.YYYY'
                }) + '&dateTo=' + getFormattedDate('DD.MM.YYYY') + '&cardId=' + card.id, data).transactions;
                var res = '';
                if (json) {
                    for (var i = 0; i < json.length; i++) {
                        let s = parseBalance(json[i].amount);
                        res += (res ? '<br>' : '')
                        res += '<b><strong><font  color=#' + (s < 0 ? 'B00000' : '1e3b24') + '>' + s.toFixed(2) + ' ' + (json[i].restCurrency || json[i].originalAmountCurrency) + '</font> <font color=#1A5276>' + json[i].dateTime + ':</font></strong></b><br>';
                        res += json[i].description;
                        if (json[i].rest) res += '<br><small>Остаток:' + json[i].rest.toFixed(2) + ' ' + json[i].restCurrency + '</small>';
                    }
                }
                result.statment = res;
            }
        }
    }
    if (cards.length > 1) {
        var cardsData = [];
        cards.forEach(c => {
        //    if (c.id != bonusCard[0].id) 
        cardsData.push(readCard(c, result, prefs, data))
        });
        if (isAvailable('info')) {
            var info = cardsData.filter(cd => cd.info).map(cd => cd.name + '<br>' + cd.number + '<br>' + cd.info).join('<br>')
            if (info) result.info = info;
        }
        if (isAvailable('statment')) {
            var newData = [];
            cardsData.forEach(card => card.data.forEach(
                data => {
                    newData.push({
                        name: card.name,
                        number: card.number,
                        amount: data.amount,
                        originalAmountCurrency: data.originalAmountCurrency,
                        dateTime: data.dateTime,
                        description: data.description,
                        rest: data.rest,
                        restCurrency: data.restCurrency,
                    })
                }))
            newData.sort((a, b) => parseDate(b.dateTime, true) - parseDate(a.dateTime, true));

            var previosDate = '';
            var previosCard = '';
            result.statment = newData.map(data => {
                let s = parseBalance(data.amount, true);
                let res = '';
                let dataDate = data.dateTime.replace(/([^\s]*)\s([^\s]*)/, '$1')
                if (previosDate != dataDate) {
                    if (previosDate) res = '<br>'
                    res += '<b><strong>' + dataDate + '</b></strong>:<br>'
                    previosCard = '';
                }
                dataCard = data.number;
                if (dataCard != previosCard) {
                    res += data.name;
                    if (prefs.showCard == 2)
                        res += '<small> (' + dataCard + ')</small>';
                    res += '<br>';
                }
                res += '<b><strong><font  color=#' + (s < 0 ? 'B00000>' : '1e3b24>+') + s.toFixed(2) + ' ' + (data.restCurrency || data.originalAmountCurrency) + ' </font><font color=#1A5276>' + data.dateTime.replace(/([^\s]*)\s([^\s]*)/, '$2') + ':</font></strong></b><br>' + data.description;
                if (data.rest) res += '<br><small>Остаток:' + data.rest.toFixed(2) + ' ' + data.restCurrency + '</small>';
                previosDate = dataDate;
                previosCard = dataCard;
                return res;
            }).join('<br><br>');
        }
        result.currency = 'грн.'
        result.balance = totalBalance.toFixed(2);
        if (!prefs.showLimit || prefs.showLimit == 2)
            result.suflimit = ' ' + result.currency;
        else if (prefs.showLimit == 0) {
            result.suflimit = ' ' + result.currency;
            result.balance = (totalBalance - totalLimit).toFixed(2);
        } else if (prefs.showLimit == 1) {
            result.balance = (totalBalance - totalLimit).toFixed(2);
            result.suflimit = '+' + totalLimit + ' ' + result.currency;
        }

    }
    AnyBalance.setResult(result);
}
var counters = {
    INET: 1,
    MSB: 1,
    KDV: 1,
    KUN: 1,
    DEP: 1,
    card: 1
}
var totalBalance = totalLimit = 0;

function readCard(card, result, prefs, data) {

    if (!counters[card.product] || counters[card.product] > 3) {
        if (!counters[card.product])
            AnyBalance.trace('Неизвестный тип карты ' + card.product + ' для карты ' + card.name)
        card.product = 'card';
    }
    card.counterNumber = counters[card.product];
    counters[card.product]++;
    if ((card.currency == 'UAH' || card.currency == 'грн') && isAvailable(card.product + card.counterNumber)) {
        totalBalance += parseBalance(card.balance);
        totalLimit += card.limit;
    }
    let currency = valut(card.currency);
    result[card.product + card.counterNumber] = card.balance;
    result[card.product + card.counterNumber + '_currency'] = currency;
    if (card.limit) {
        if (!prefs.showLimit || prefs.showLimit == 2)
            result[card.product + card.counterNumber + '_suf'] = ' ' + currency;
        else if (prefs.showLimit == 0) {
            result[card.product + card.counterNumber + '_suf'] = ' ' + currency;
            result[card.product + card.counterNumber] = card.balance - card.limit;
        } else if (prefs.showLimit == 1) {
            result[card.product + card.counterNumber] = card.balance - card.limit;
            result[card.product + card.counterNumber + '_suf'] = '+' + card.limit + ' ' + currency;
        }

    } else {
        result[card.product + card.counterNumber + '_suf'] = ' ' + currency;
    }
    if ((prefs.showCard>0 || !isAvailable(card.product + card.counterNumber)))
        result[card.product + card.counterNumber + '_pref'] = card.name.replace(/\s?карта\s?/i, '') + (prefs.showCard == 2 || !isAvailable(card.product + card.counterNumber) ? ' ' + card.number : '') + ': ';

    var statment = {
        balance: card.balance,
        name: card.name.replace(/\s?карта\s?/i, ''),
        id: card.id,
        number: card.number,
        data: []
    }
    if (AnyBalance.getData('balance' + card.id) == card.balance) {
        statment.data = getJson(AnyBalance.getData('data' + card.id));
        let info = AnyBalance.getData('info' + card.id);
        if (info) statment.info = info;
        return statment;
    }
    if (card.payAvailable) {
        if (isAvailable('info')) {
            var json = callAPI('card/getlimits', data, {
                action: "getCustomLimits",
                cardId: card.id,
            });
            var info = '';
            if (json.cashLimit && json.cashLimit.isLimitSet == true)
                info += 'Лимит на снятие наличных:<br>' + json.cashLimit.usedValue + ' ' + valut(json.currencyCard) + periods[json.cashLimit.period];
            if (json.internetLimit && json.internetLimit.isLimitSet == true)
                info += (info ? '<br>' : '') + 'Лимит на расчеты в интернет:<br>' + json.internetLimit.usedValue + ' ' + valut(json.currencyCard) + periods[json.internetLimit.period];
            statment.info = info;
        }
        if (isAvailable('statment')) {
            var json = callAPI('statements?shiftToLast=false&action=getStatements&lang=ru&dateFrom=' + getFormattedDate({
                offsetDay: 3,
                format: 'DD.MM.YYYY'
            }) + '&dateTo=' + getFormattedDate('DD.MM.YYYY') + '&cardId=' + card.id, data);
            if (json) json = json.transactions;
            if (json) {
                for (var i = 0; i < json.length; i++) {
                    let res = {};
                    res.amount = json[i].amount;
                    res.originalAmountCurrency = json[i].originalAmountCurrency;
                    res.dateTime = json[i].dateTime;
                    res.description = json[i].description;
                    res.rest = json[i].rest;
                    res.restCurrency = json[i].restCurrency;
                    statment.data.push(res);
                }
            }
        }
    }
    AnyBalance.setData('balance' + card.id, card.balance);
    AnyBalance.setData('data' + card.id, JSON.stringify(statment.data));
    if (statment.info) AnyBalance.setData('info' + card.id, JSON.stringify(statment.info));
    AnyBalance.saveData();


    return statment;

}

const iiud_part = (len, base = 16) => Math.floor((1 + Math.random()) * base ** len).toString(base).substring(1);
const generateUUID = (mask = '4', base = 16) => mask.match(/\d+/g).map(m => iiud_part(m, base)).join('-');

function loginSite(prefs, data) {
    var pt = data.pt;
    AnyBalance.trace('Начало авторизации');
    var fingerprint = '';
    var answers = {};
    data.pass = AnyBalance.retrieveCode('Для авторизации в приложении Приват24 введите пароль для входа по номеру\n' + prefs.login.replace(/(\d{2})(\d{3})(\d{3})(\d{2})(\d{2})/, '+$1 ($2) $3-$4-$5'), null, {
        time: 600000,
    })
    answers.show_static_password_form = {
        static_password: data.pass,
        as_legal_person: "false",
        cmd: "show_static_password_form"
    }
    answers.show_sms_password_form = {
        cmd: 'show_sms_form',
    }
    answers.show_pin_cards_form = {
        cmd: 'show_pin_form'
    }
    const allForms = {
        fingerprint: fingerprint,
        lat: 0,
        lon: 0,
        action: "submit"
    }

    var url = 'https://mob2.privat24.ua/api/proxy/auth/?login=' + prefs.login + '&pt=' + pt + '&lang=ru';

    function doStep(step) {
        if (step) AnyBalance.trace('step:' + step);
        if (answers[step]) {
            var html = AnyBalance.requestPost(url, JSON.stringify(Object.assign(answers[step], allForms)), g_geaders);
            answers[step] = null;
        } else {
            var html = AnyBalance.requestGet(url, g_geaders);
        }
        AnyBalance.trace('Server answer:\n' + html);
        json = getJson(html);
        if (json.status == 'error') throw new AnyBalance.Error(json.message, false, true)
        return json;
    }

    function getPIN(json) {
        var i = 0;
        var cards = json.data.cardlist.map(j => {
            i++;
            return i + '.' + (j.card_currency != 'UAH' ? j.card_currency + ' ' : '') + j.card_name + ' (' + j.card_mask + ')'
        }).join('\n');
        var cardNum = parseInt(AnyBalance.retrieveCode('Выберите карту, от которой Вы помните PIN-код\n' + cards+'\nВведите число от 1 до '+i, null, {
            time: 60000,
            inputType: 'number',
            minLength: 1,
            maxLength: 2,
        })) - 1;
        if (!json.data.cardlist[cardNum]) {
        	Anybalance.trace('Введено "'+cardNum+'" при выборе от 1 до '+i);
        	throw new AnyBalance.Error("Карта для ввода PIN не найдена", false, true);
        	}
        var pin = AnyBalance.retrieveCode('Введите PIN-код, от карты\n' + (json.data.cardlist[cardNum].card_currency != 'UAH' ? json.data.cardlist[cardNum].card_currency + ' ' : '') + json.data.cardlist[cardNum].card_name + ' (' + json.data.cardlist[cardNum].card_mask + ')\nОсталось попыток:' + json.data.check_pin_counter, null, {
            time: 60000,
            inputType: 'number',
            minLength: 4,
            maxLength: 8
        });
        answers.show_pin_cards_form.card_id = json.data.cardlist[cardNum].card_id;
        AnyBalance.requestGet('https://pin.privatbank.ua/pinblok/create?json=' + encodeURIComponent(JSON.stringify({
            pin: pin,
            sessionid: json.data.pref,
            systemid: 'id1'
        })), {
            'User-Agent': 'okhttp/3.12.1'
        });
        AnyBalance.sleep(1500);

    }

    for (var i = 0; i < 50; i++) {
        if (i > 0) AnyBalance.sleep(1000);
        var json = doStep();
        //        var html = AnyBalance.requestGet(url, g_geaders);
        //        var json = getJson(html);
        if (json.data && json.data.ts) url = url.replace(prefs.login, '').replace(/(&ts=\d*)/, '') + '&ts=' + json.data.ts;
        if (json.data && json.data.step) {
            if (json.data.step.id == 'show_static_password_form') {
                if (!answers[json.data.step.id]) continue;
                AnyBalance.trace('Запрошен пароль');
                json = doStep(json.data.step.id)
                if (!json.data || !json.data.step) continue;
            }
            while (json.data && (json.data.step.id == 'show_ivr_form' || json.data.step.id == 'show_login_pone_form')) {
                AnyBalance.trace('Звонок от приватбанка с номера ' + json.data.ivrPhone + '. Ждем 1 минуту');
                AnyBalance.sleep(10000);
                i = 0;
                json = doStep(json.data.step.id)
            }
            if (!json.data || !json.data.step) continue;
            /**
             if (json.data.step.id == 'show_ivr_3digits_form') {
            	var code = AnyBalance.retrieveCode('Вам звонит приватбанк на номер '+json.data.phone+'\nВведите последние три цифры номер с которого вам звонили' , null, {time: 60000, inputType: 'number',minLength: 3,maxLength: 3,});
                show_sms_password_form.sms_incoming_password=code;
                var html = AnyBalance.requestPost(url, JSON.stringify(show_sms_password_form), g_geaders);
                json = getJson(html);
                if (!json.data || !json.data.step) continue;
            }
             */
            if (json.data.step.id == 'show_sms_password_form') {
                if (!answers[json.data.step.id]) continue;
                AnyBalance.trace('Запрошен код из SMS');
                var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения для входа в личный кабинет, отправленный вам по СМС на номер ' + json.data.phone, null, {
                    time: 60000,
                    inputType: 'number',
                    minLength: 3,
                    maxLength: 8,
                });
                answers.show_sms_password_form.sms_incoming_password = code;
                json = doStep(json.data.step.id)
                if (!json.data || !json.data.step) continue;
            }
            while (json.data.step.id == 'show_channels_form') {
                AnyBalance.trace('Нужно подтверждение входа в мобильном приложении. Ждем 1 минуту.');
                AnyBalance.sleep(10000);
                i = 0;
                json = doStep(json.data.step.id)
                if (!json.data || !json.data.step) continue;
            }
            if (json.data.step.id == 'show_pin_cards_form') {
                if (!answers[json.data.step.id]) continue;
                AnyBalance.trace('Вводим пинкод');
                getPIN(json);
                json = doStep(json.data.step.id);
                if (!json.data || !json.data.step) continue;
            }
            if (json.data.step.id == 'redirect') {
                AnyBalance.trace('Авторизовались успешно');
                break;
            }
            throw new AnyBalance.Error(json.data.step.id + ' - Неизвестный шаг во время авторизаци.', null, true);
        }
    }
    if (json.data.step.id != 'redirect') {
        AnyBalance.trace(html);
        AnyBalance.requestPost(url, JSON.stringify({
            action: 'cancel'
        }), g_geaders);
        throw AnyBalance.Error('Не удалось войти в Приват24', null, true);
    }
    data.sid = json.data.sid;
    data.token = json.data.access_token;
    AnyBalance.setData('imei' + prefs.login, data.imei);
    AnyBalance.setData('pt' + prefs.login, data.pt);
    AnyBalance.setData('sid' + prefs.login, data.sid);
    AnyBalance.setData('token' + prefs.login, data.token);
    AnyBalance.setData('pass' + prefs.login, data.pass);
    AnyBalance.saveData();

    //redirect
    //show_admin_form
    //show_change_password_form
    //show_email_form
    //show_email_password_form
    //show_email_wait_form
    //show_facebook_form
    //show_ivr_3digits_form
    //show_ivr_captcha_form
    //show_ivr_form
    //show_login_form
    //show_pin_form
    //show_sms_form
    //show_social_email_form
    //show_static_password_form
    //unknown
}