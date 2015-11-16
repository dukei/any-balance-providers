/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */


var region_aliases = {
    eao: 'primorye',
    dv: 'primorye'
};

var regionsOrdinary = {
    auto: "https://ihelper.mts.ru/selfcare/",
    center: "https://ihelper.mts.ru/selfcare/",
    primorye: "https://ihelper.dv.mts.ru/selfcare/",
    nnov: "https://ihelper.nnov.mts.ru/selfcare/",
    nw: "https://ihelper.nw.mts.ru/selfcare/",
    sib: "https://ihelper.sib.mts.ru/selfcare/",
    ural: "https://ihelper.nnov.mts.ru/selfcare/", //Почему-то урал в конце концов переадресуется сюда
    ug: "https://ihelper.ug.mts.ru/selfcare/"
};

var g_baseurl = 'https://lk.ssl.mts.ru';
var g_baseurlLogin = 'https://login.mts.ru';

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ru,en;q=0.8',
    'Cache-Control': 'max-age=0',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.124 Safari/537.36',
    'If-Modified-Since': null, //Иначе МТС глючит с кешированием...
};

var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function getParamByName(html, name) {
    return getParam(html, null, null, new RegExp('name=["\']' + name + '["\'][^>]*value=["\']([^"\']+)"', 'i'));
}

function isInOrdinary(html) {
    return /<div[^>]+class="main-menu"/i.test(html);
}

function uniq_fast(a) {
    var seen = {};
    var out = [];
    var len = a.length;
    var j = 0;
    for (var i = 0; i < len; i++) {
        var item = a[i];
        if (seen[item] !== 1) {
            seen[item] = 1;
            out[j++] = item;
        }
    }
    return out;
}

function setCsrfCookie(baseurl, html){
    var token = getParam(html, null, null, /<input[^>]+name="csrfToken"[^>]*value="([^"]*)/i);
    var domain = getParam(baseurl, null, null, /\/\/(.*?)\//);

    // Надо грохнуть старую куку
    AnyBalance.setCookie(domain, 'csrfToken', null);
    // И если есть еще одну
    AnyBalance.setCookie(domain, 'csrfToken', null);

    AnyBalance.setCookie(domain, 'csrfToken', token);
}

function fetchOrdinary(html, baseurl, result) {
    var prefs = AnyBalance.getPreferences();

    if (prefs.phone && prefs.phone != prefs.login) {
        AnyBalance.trace('Требуется другой номер. Пытаемся переключиться...');

        html = AnyBalance.requestGet(baseurl + 'my-phone-numbers.aspx', g_headers);
        var pages = uniq_fast(sumParam(html, null, null, /__doPostBack\('ctl00\$MainContent\$pagerLink','(\d+)'/g));
        AnyBalance.trace(pages.length + ' ещё страниц моих номеров найдено');

        do {
            setCsrfCookie(baseurl, html);
            var token = getParam(html, null, null, /<input[^>]+name="csrfToken"[^>]*value="([^"]*)/i);

            // Проверим, есть ли такой номер в списке
            var formattedNum = (prefs.phone || '').replace(/(\d{3})(\d{3})(\d{2})(\d{2})/i, '$1\\D$2\\D$3\\D$4');

            // Уже выбран этот номер
            if (new RegExp('"account-phone-number current"[^>]*>\\s*\\+7\\s*' + formattedNum, 'i').test(html)) {
                AnyBalance.trace('Номер ' + prefs.phone + ' уже выбран.');
                break;
            } else {
                if (!new RegExp('doPostBack\\(\'[^\']+\',\'7' + prefs.phone, 'i').test(html)) {
                    if (pages.length > 0) {
                        var page = pages.shift();
                        AnyBalance.trace(prefs.phone + ": этот номер не принадлежит логину " + prefs.login + ". Попробуем другую страницу - " + page);
                        html = AnyBalance.requestPost(baseurl + 'my-phone-numbers.aspx', [
                            ['ctl00_sm_HiddenField', ''],
                            ['csrfToken', token],
                            ['__EVENTTARGET', 'ctl00$MainContent$pagerLink'],
                            ['__EVENTARGUMENT', page],
                            ['__VIEWSTATE', getParamByName(html, '__VIEWSTATE')],
                            ['__VIEWSTATEGENERATOR', getParamByName(html, '__VIEWSTATEGENERATOR')],
                        ], addHeaders({Referer: baseurl + 'my-phone-numbers.aspx', Origin: 'https://ihelper.mts.ru'}));
                        continue; //Ещё разок пробуем
                    } else {
                        throw new AnyBalance.Error(prefs.phone + ": этот номер не принадлежит логину " + prefs.login);
                    }
                }

                html = AnyBalance.requestPost(baseurl + 'my-phone-numbers.aspx', [
                    ['ctl00_sm_HiddenField', ''],
                    ['csrfToken', token],
                    ['__EVENTTARGET', 'ctl00$MainContent$transitionLink'],
                    ['__EVENTARGUMENT', '7' + prefs.phone],
                    ['__VIEWSTATE', getParamByName(html, '__VIEWSTATE')],
                    ['__VIEWSTATEGENERATOR', getParamByName(html, '__VIEWSTATEGENERATOR')],
                ], addHeaders({Referer: baseurl + 'my-phone-numbers.aspx', Origin: 'https://ihelper.mts.ru'}));

                if (!new RegExp('<li>\\s*Номер:\\s*<strong>\\+7\\s*' + formattedNum, 'i').test(html))
                    throw new AnyBalance.Error('Не удалось переключиться на номер ' + prefs.phone + '. Вероятно, он не принадлежит логину ' + prefs.login);

                break;
                /*if (!html)
                 throw new AnyBalance.Error(prefs.phone + ": номер, возможно, неправильный или у вас нет к нему доступа");*/
                // var error = getParam(html, null, null, /(<h1>Мои номера<\/h1>)/i);
                // if (error)
                // throw new AnyBalance.Error(prefs.phone + ": номер, возможно, неправильный или у вас нет к нему доступа");
            }
        } while (true);
    }
    // Тарифный план
    getParam(html, result, 'tariff', /Тарифный план.*?>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    // Баланс
    getParam(html, result, 'balance', /<span[^>]*id="customer-info-balance[^>]*>([\s\S]*?)(?:\(|<\/span>)/i, replaceTagsAndSpaces, parseBalance);
    // Телефон
    if(!result.info)
        result.info = {};
    getParam(html, result.info, 'info.phone', /Номер:.*?>([^<]*)</i, replaceNumber, html_entity_decode);

    if (AnyBalance.isAvailable('bonus') && !isset(result.bonus))
        result.bonus = null; //Не сбрасываем уже ранее полученное значение бонуса в 0. Может, мы получаем из помощника, потому что сдох ЛК

    if (isAvailableStatus()) {
        AnyBalance.trace("Fetching status...");
        if (!/<h1>Состояние счета<\/h1>/i.test(html)) {
            AnyBalance.trace('Не нашли заголовка "состояние счета". Заходим на account-status.aspx');
            html = AnyBalance.requestGet(baseurl + "account-status.aspx", g_headers);
        }
        fetchAccountStatus(html, result);
    }
    if (AnyBalance.isAvailable('tourist')) {
        AnyBalance.trace("Fetching accumulated counters...");
        html = AnyBalance.requestGet(baseurl + "accumulated-counters.aspx", g_headers);
        fetchAccumulatedCounters(html, result);
    }
    if (AnyBalance.isAvailable('abonservice', 'info.date_start')) {
        AnyBalance.trace("Fetching paid services...");
        checkIHError(html, result);
        html = AnyBalance.requestGet(baseurl + "product-2-view.aspx", g_headers);
        sumParam(html, result, 'abonservice', /<tr[^>]+class="gm-row-item(?:[\s\S](?!<\/tr>))*?<td[^>]+class="price"[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
        if(!result.info)
            result.info = {};
        sumParam(html, result.info, 'info.date_start', /<tr[^>]+class="gm-row-item(?:[\s\S](?!<\/tr>))*?<td[^>]+class="grid-date"[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
    }
    if(AnyBalance.isAvailable('expenses')){
        processExpences(baseurl, result);
    }
    if(AnyBalance.isAvailable('payments')){
        processPayments(baseurl, result);
    }
    if(AnyBalance.isAvailable('detalization')){
        processDetalization(baseurl, result);
    }
}

function checkIHError(html, result) {
    var error = getParam(html, null, null, /<div[^>]+class="b_error"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    if (error) {
        if(result === true){
            throw new AnyBalance.Error('Ошибка со стороны МТС: ' + error);
        }else {
            AnyBalance.trace('Ошибка со стороны МТС: ' + error);
            setCountersToNull(result);
        }
    }
}

function isAvailableStatus() {
    return AnyBalance.isAvailable('remainders', 'info.licschet', 'info.sim', 'statuslock', 'credit', 'usedinthismonth', 'bonus_balance', 'debt', 'pay_till');
}

function fetchAccumulatedCounters(html, result) {
    AnyBalance.trace("Parsing accumulated counters...");
    if(!result.remainders)
        result.remainders = {};

    checkIHError(html, result);
    getParam(html, result.remainders, 'remainders.tourist', /Счетчик Туристическая СИМ-карта от МТС\.[\s\S]*?<td[^>]+class="counter-value"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
}

function fetchAccountStatus(html, result) {
    AnyBalance.trace("Parsing status...");
    checkIHError(html, result);
    if(!result.remainders)
        result.remainders = {};
    if(!result.info)
        result.info = {};


    // Ближайший срок истекания пакета минут
    sumParam(html, result.remainders, 'remainders.min_till', [/мин\.?,?\s*(?:Пакет\s*)?действует до ([^<]*)/ig, /Остаток пакета минут:[^<]*действует до([^<]*)/ig], replaceTagsAndSpaces, parseDate, aggregate_min);
    // Ближайший срок истекания пакета SMS
    sumParam(html, result.remainders, 'remainders.sms_till', /(?:смс|sms)[^<]*[.:,]*\s*(?:Пакет\s*)?действует до ([^<]*)/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
    // Ближайший срок истекания пакета MMS
    sumParam(html, result.remainders, 'remainders.mms_till', /(?:ммс|mms)[^<]*[.:,]*\s*(?:Пакет\s*)?действует до ([^<]*)/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
    // Разделим минуты на МТС и МТС РФ
    html = sumParam(html, result.remainders, 'remainders.min_left_mts_rf', /Оста(?:лось|ток):?\s*([\d\.,]+)\s*(?:бесплатных\s*)?мин[^>]+МТС (?:РФ|России)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
    html = sumParam(html, result.remainders, 'remainders.min_left_mts_rf', /Оста(?:лось|ток)[^<]+мин[^>]+МТС РФ:\s*([\d\.,]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
    //Территория МТС (3000 минут): Осталось 0 минут
    html = sumParam(html, result.remainders, 'remainders.min_left_mts', /Территория МТС.*?: Осталось\s*([\d\.,]+)\s*мин/ig, replaceFloat, parseBalance, aggregate_sum, true);
    html = sumParam(html, result.remainders, 'remainders.min_left_mts', /Оста(?:ток|лось):?\s*([\d\.,]+)\s*мин\S*\s*(?:на\s*)?МТС/ig, replaceFloat, parseBalance, aggregate_sum, true);
    //html = sumParam (html, result, 'min_left_mts', /Остаток:?\s*([\d\.,]+)\s*мин\S* на МТС/ig, replaceFloat, parseBalance, aggregate_sum, true);
    //Срочный контракт (15%, 25% как 15%): Осталось 0 минут
    html = sumParam(html, result.remainders, 'remainders.min_left', /Срочный контракт.*?: Осталось\s*([\d\.,]+)\s*мин/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
    // Пакет минут
    html = sumParam(html, result.remainders, 'remainders.min_left', /Остаток (?:ежесуточного )?пакета минут:\s*([\d\.,]+)\s*[м\.,<]/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
    // Остаток бонуса
    html = sumParam(html, result.remainders, 'remainders.min_left', /Остаток бонуса:\s*([\d\.,]+?)\s*мин/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
    // Пакет минут (МТС+ОСС+ОФС) в дом. регионе": 1710мин</li>
    html = sumParam(html, result.remainders, 'remainders.min_left', /Пакет минут[^<]*?([\d\.,]+?)\s*мин/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);

    // Остаток минут
    html = sumParam(html, result.remainders, 'remainders.min_left', /Осталось:?\s*([\d\.,]+)\s*(?:бесплатных\s*)?мин/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
    // Пакет минут Готовый офис: Остаток 149 минут
    // Остаток: минут
    html = sumParam(html, result.remainders, 'remainders.min_left', /Остаток:?\s*([\d\.,]+)\s*мин/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
    // Остаток минут по тарифу "Готовый офис":194 минут МТС России
    html = sumParam(html, result.remainders, 'remainders.min_left_mts', /Остаток мин[^<]*?([\d\.,]+)\s*мин[^<]*?МТС России/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
    // Остаток минут по тарифу "Готовый офис"194 минут.другие операторы
    html = sumParam(html, result.remainders, 'remainders.min_left', /Остаток мин[^<]*?([\d\.,]+)\s*мин/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
    // Остаток ежемесячных пакетов: 392 минут
    html = sumParam(html, result.remainders, 'remainders.min_left', /Остаток ежемесячных пакетов\s*(?:минут\s*)?:?\s*([\d\.,]+)\s*мин/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
    // Остаток ежемесячного пакета: 296 мин
    html = sumParam(html, result.remainders, 'remainders.min_left', /Остаток ежемесячного пакета\s*(?:минут\s*)?:?\s*([\d\.,]+)\s*мин/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
    // Остаток пакета: 24 минут
    html = sumParam(html, result.remainders, 'remainders.min_left', /Остаток пакета:?\s*([\d\.,]+)\s*мин/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
    html = sumParam(html, result.remainders, 'remainders.min_left', /Пакет минут[^:]*:\s*Оста[^\d]*([\d\.,]+)\s*мин/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
    // Подбаланс минуты: 73 мин
    html = sumParam(html, result.remainders, 'remainders.min_left', /Подбаланс минуты\s*:?\s*([\d\.,]+)\s*мин/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
    // Остаток пакета минут на ТП "MAXI": 12000 секунд
    html = sumParam(html, result.remainders, 'remainders.min_left', /Остаток пакета минут[^<]*?([\d\.,]+)\s*сек/ig, replaceTagsAndSpaces, function (str) {
        return Math.round(parseBalance(str) / 60)
    }, aggregate_sum, true);
    // Остаток "Бесплатных вызовов при платеже": 29
    html = sumParam(html, result.remainders, 'remainders.min_left', /"Бесплатных вызовов при платеже":[^<]*?([\d\.,]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
    // Осталось минут (Smart):278.
    html = sumParam(html, result.remainders, 'remainders.min_left', /Осталось минут[^<]*?:\s*([\d\.,]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
    //Осталось по опции "Супер Область": 60 мин
    html = sumParam(html, result.remainders, 'remainders.min_left', /Осталось по опции[^<]*?:\s*([\d\.,]+)\s+мин/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
    // Бизнес пакеты
    html = sumParam(html, result.remainders, 'remainders.min_left', /местные минуты[^<]*?:\s*([\d\.,]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
    html = sumParam(html, result.remainders, 'remainders.min_left_mezh', /междугородные минуты[^<]*?:\s*([\d\.,]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
    // <li>Остаток пакета "Пакет МГ минут в дом. регионе":13мин МГ</li>
    html = sumParam(html, result.remainders, 'remainders.min_left_mezh', /Пакет МГ[^<]*?([\d\.,]+?)\s*мин/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);

    // Использовано: 0 минут местных и мобильных вызовов.
    // Использовано 1 мин на городские номера Москвы, МТС домашнего региона и МТС России
    sumParam(html, result.remainders, 'remainders.min_local', /Использовано:?\s*([\d\.,]+)\s*мин[^\s]* (местных|на городские)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    // Использовано: 0 минут на любимые номера
    sumParam(html, result.remainders, 'remainders.min_love', /Использовано:?\s*([\d\.,]+)\s*мин[^\s]* на любимые/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    //Использовано: 17 мин на МТС России 
    sumParam(html, result.remainders, 'remainders.min_used_mts', /Использовано:?\s*(\d+)\s*мин\S* на МТС/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    // Остаток СМС Перезвони мне 
    html = sumParam(html, result.remainders, 'remainders.sms_left_perezvoni', /Осталось:?\s*([0-5])\s*(?:sms|смс)\.?\s*<[^>]*>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
    // Остаток ежемесячных пакетов: 392 смс
    html = sumParam(html, result.remainders, 'remainders.sms_left', /Остаток ежемесячных пакетов\s*:?\s*([\d\.,]+)\s*(?:смс|sms)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
    // Остаток ежемесячного пакета : 98 смс
    html = sumParam(html, result.remainders, 'remainders.sms_left', /Остаток ежемесячного пакета\s*:?\s*([\d\.,]+)\s*(?:смс|sms)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
    // Остаток СМС
    html = sumParam(html, result.remainders, 'remainders.sms_left', /(?:Осталось|Остаток)(?: пакета)? (?:sms|смс):\s*(\d+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
    // Остаток СМС
    html = sumParam(html, result.remainders, 'remainders.sms_left', /(?:Осталось|Остаток)[^\d]*(\d+)\s*(?:sms|смс)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
    //Остаток пакета Безлимит М2М SMS: 61
    html = sumParam(html, result.remainders, 'remainders.sms_left', /Остаток пакета[^<]*?(?:смс|sms):\s*([\d\.,]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
    // Осталось sms (Smart):278.
    html = sumParam(html, result.remainders, 'remainders.sms_left', /Осталось sms[^<]*?:\s*([\d\.,]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
    //Остаток пакета SMS в Европе: 22. Пакет действует до 21.01.2014
    html = sumParam(html, result.remainders, 'remainders.sms_europe', /Остаток\s+пакета\s+SMS\s+в\s+Европе:([\s\d]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
    //Остаток пакета SMS в поездках по миру: 100. Пакет действует до 10.02.2014
    html = sumParam(html, result.remainders, 'remainders.sms_world', /Остаток\s+пакета\s+SMS\s+в\s+поездках\s+по\s+миру:([\s\d]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
    //Использовано: 6 sms
    sumParam(html, result.remainders, 'remainders.sms_used', /Использовано:\s*([\d\.,]+)\s*(?:смс|sms)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    // Остаток ММС
    sumParam(html, result.remainders, 'remainders.mms_left', /(?:Осталось|Остаток)(?: пакета)? (?:mms|ммс):\s*(\d+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    sumParam(html, result.remainders, 'remainders.mms_left', /(?:Осталось|Остаток)[^\d]*(\d+)\s*(?:mms|ммс)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    // Накоплено 54 мин. в текущем месяце
    sumParam(html, result.remainders, 'remainders.min_used', /Накоплено\s*([\d\.,]+)\s*мин[^\s]*/g, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    // Сумма по неоплаченным счетам: 786.02 руб. (оплатить до 24.03.2012)
    getParam(html, result, 'debt', /Сумма [^<]*по неоплаченным счетам(?:[\s\S](?!<\/td|<\/p))*?([-\d\.,]+)\s+руб/i, replaceTagsAndSpaces, parseBalance);
    // Сумма по неоплаченным счетам: 786.02 руб. (оплатить до 24.03.2012)
    getParam(html, result, 'pay_till', /оплатить до\s*([\d\.,\/]+)/i, replaceTagsAndSpaces, parseDate);
/*    // Остаток трафика
    getParam(html, result.remainders, 'remainders.traffic_left', /(?:Осталось|Остаток)[^\d]*(\d+[\.,]?\d* *([kmgкмг][бb]|байт|bytes))/i);
    //Подбаланс gprs: 49,26 Mb
    getParam(html, result.remainders, 'remainders.traffic_left', /Подбаланс gprs:[^\d]*(\d+[\.,]?\d*\s*([kmgкмг][бb]|байт|bytes))/i); */
    // Остаток трафика
    sumParam(html, result.remainders, 'remainders.traffic_left_mb', /(?:Осталось|Остаток)[^\d]*(\d+[\.,]?\d* *([kmgкмг][бb]|байт|bytes))/ig, null, parseTraffic, aggregate_sum);
    //Подбаланс gprs: 49,26 Mb
    sumParam(html, result.remainders, 'remainders.traffic_left_mb', /Подбаланс gprs:[^\d]*(\d+[\.,]?\d*\s*([kmgкмг][бb]|байт|bytes))/ig, null, parseTraffic, aggregate_sum);
    //Подбаланс gprs: 1,17 Mb до 26.11.2013
    sumParam(html, result.remainders, 'remainders.traffic_left_till', [/Подбаланс gprs:[^<]*?[kmgкмг][бb]\s*до\s*([\s\S]*?)<\//ig, /Остаток GPRS-пакета[^<]*[мm][бb][^<]*действует до([^<]*)/ig], null, parseDate, aggregate_min);
    // Лицевой счет
    getParam(html, result.info, 'info.licschet', /№([\s\S]*?)[:<]/, replaceTagsAndSpaces, html_entity_decode);
    // Симкарта
    getParam(html, result.info, 'info.sim', /Номер SIM-карты:([\s\S]*?)[:<]/, replaceTagsAndSpaces, html_entity_decode);
    // Блокировка
    getParam(html, result, 'statuslock', /<(?:p|div)[^>]+class="account-status-lock"[^>]*>([\s\S]*?)<\/(?:p|div)>/i, replaceTagsAndSpaces, html_entity_decode);
    // Сумма кредитного лимита
    getParam(html, result, 'credit', /(?:Лимит|Сумма кредитного лимита)[\s\S]*?([-\d\.,]+)\s*\(?руб/i, replaceTagsAndSpaces, parseBalance);
    // Расход за этот месяц
    getParam(html, result, 'usedinthismonth', /Израсходовано [^<]*?(?:<[^>]*>)?([\d\.,]+) \(?руб/i, replaceTagsAndSpaces, parseBalance);
    //Остаток бонуса 100 руб
    getParam(html, result.remainders, 'remainders.bonus_balance', /Остаток бонуса:?\s*([\d\.,]+)\s*р/i, replaceTagsAndSpaces, parseBalance);
}

function isLoggedIn(html) {
    return getParam(html, null, null, /(<meta[^>]*name="lkMonitorCheck")/i);
}

function getLKJson(html, allowExceptions) {
    try {
        var html = AnyBalance.requestGet('https://oauth.mts.ru/webapi-1.4/customers/@me', addHeaders({
            'X-Requested-With': 'XMLHttpRequest',
            'Authorization': 'Bearer sso_1.0_websso_cookie'
        }));

        var json = getParam(html, null, null, /^\{[\s\S]*?\}$/i);
        if (!json) {
            AnyBalance.trace(html);

            var error = getParam(html, null, null, /<div[^>]+class="red-status"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
            if (error)
                throw new AnyBalance.Error(error);

            throw new AnyBalance.Error('Не удалось найти Json с описанием пользователя, сайт изменен?');
        }
    } catch (e) {
        var json = "{}";
        if (allowExceptions) {
            throw e;
        } else {
            AnyBalance.trace(e.message);
            AnyBalance.trace('Не удалось найти Json с описанием пользователя, сайт изменен?');
        }
    }

    return json;
}

function isAnotherNumber() {
    var prefs = AnyBalance.getPreferences();
    return prefs.phone && prefs.phone != prefs.login;
}

function checkLoginState(html, loginUrl, options) {
    if (/checkAuthStatus\(\)|дождитесь окончания процесса авторизации/i.test(html)) {
        var json = {}, tries = 20;
        while (json.Data != 'Success' && tries-- > 0) {
            json = AnyBalance.requestGet(g_baseurl + '/WaitAuth/CheckAuth', addHeaders({Referer: g_baseurl + '/waitauth?goto=http://lk.ssl.mts.ru/'}));
            json = getJson(json);

            if (json.Data == 'Success')
                break;

            sleep(1000);
        }
        // Если прождали авторизацию, а она так и не произошла надо об этом явно сообщить
        if (json.Data != 'Success') {
            if (options && options.automatic) {
                //Это была попытка автоматического входа. Раз он не получился, давайте попробуем по логину и паролю
                AnyBalance.trace('МТС не пустил нас в ЛК после ожидания авторизации. Ладно, попробуем с логином и паролем войти.');
                return AnyBalance.requestGet(loginUrl.replace(/\/Login.*/, '/Logout', addHeaders({Referer: g_baseurl})));
            }
            throw new AnyBalance.Error('МТС не пустил нас в ЛК после ожидания авторизации. Это проблема на сайте МТС, как только работа сайта наладится - данные отобразятся.');
        }

        return AnyBalance.requestGet(g_baseurl, addHeaders({Referer: loginUrl}));
    } else {
        return html;
    }
}

function enterLK(options) {
    var loginUrl = g_baseurlLogin + "/amserver/UI/Login?service=lk&goto=" + g_baseurl + '/' + "";

    var html = AnyBalance.requestGet(g_baseurl, g_headers);
    if (AnyBalance.getLastStatusCode() >= 500) {
        AnyBalance.trace("МТС вернул 500. Пробуем ещё разок...");
        html = AnyBalance.requestGet(g_baseurl, g_headers);
    }

    if (AnyBalance.getLastStatusCode() >= 500)
        throw new AnyBalance.Error("Ошибка на сервере МТС, сервер не смог обработать запрос. Можно попытаться позже...");

    html = checkLoginState(html, loginUrl, {automatic: true});

    AnyBalance.trace('isLoggedIn(html) = ' + isLoggedIn(html));

    if (isLoggedIn(html)) {
        AnyBalance.trace("Уже залогинены, проверяем, что на правильный номер...");
        //Автоматом залогинились, надо проверить, что на тот номер

        var json = getJson(getLKJson(html));

        var loggedInMSISDN = json.id;
        if (!loggedInMSISDN) {
            AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось определить текущий номер в кабинете, сайт изменен?', true);
        }

        if (loggedInMSISDN != options.login) { //Автоматом залогинились не на тот номер
            AnyBalance.trace("Залогинены на неправильный номер: " + loggedInMSISDN + ", выходим");
            html = AnyBalance.requestGet(g_baseurlLogin + '/amserver/UI/Logout', g_headers);

            if (isLoggedIn(html)) {
                AnyBalance.trace(html);
                throw new AnyBalance.Error('Не удаётся выйти из личного кабинета, чтобы зайти под правильным номером. Сайт изменен?');
            }
        } else {
            AnyBalance.trace("Залогинены на правильный номер: " + loggedInMSISDN);
        }
    }

    if (!isLoggedIn(html)) {
        if (!options.onlyAutomatic) {
            html = enterMTS(joinObjects(options, {html: html, service: 'lk', url: AnyBalance.getLastUrl()}));
            html = checkLoginState(html, loginUrl);
        } else {
            throw new AnyBalance.Error('Ручной вход запрещен');
        }
    }

    if (!isLoggedIn(html)) {
        if (getParam(html, null, null, /(auth-status=0)/i))
            throw new AnyBalance.Error('Неверный логин или пароль. Повторите попытку или получите новый пароль на сайте ' + g_baseurl + '/.', false, true);

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Он изменился или проблемы на сайте.');
    }

    __setLoginSuccessful();

    return html;
}

function loginWithPassword(){
    AnyBalance.trace("Entering lk...");

    var prefs = AnyBalance.getPreferences();

    var html = enterLK({login: prefs.login, password: prefs.password});
    return html;
}

function followIHLink(){
    var baseurlHelper = "https://ihelper.mts.ru/selfcare/";

    var IHLink = AnyBalance.getCookie('IHLink');
    if (IHLink) {
        baseurlHelper = getParam(IHLink, null, null, /[\s\S]*?selfcare\//i, replaceTagsAndSpaces, html_entity_decode) || "https://ihelper.mts.ru/selfcare/";
    }
    var redirect = null, html;
    try {
        html = AnyBalance.requestGet(baseurlHelper + "account-status.aspx", addHeaders({Referer: g_baseurl}));
        var newUrl = AnyBalance.getLastUrl();

        if (newUrl.indexOf(baseurlHelper) != 0) {
            redirect = getParam(newUrl, null, null, /ihelper\.([\w\-]+\.)?mts.ru/i, [/\./g, '']);

            if (!redirect)
                throw new AnyBalance.Error("МТС перенаправила на неизвестный регион! " + redirect);
            if (region_aliases[redirect])
                redirect = region_aliases[redirect];
            if (!regionsOrdinary[redirect])
                throw new AnyBalance.Error("МТС перенаправила на неизвестный регион!! " + redirect);
            baseurlHelper = regionsOrdinary[redirect];
            AnyBalance.trace('Переходим напрямую в помощник ' + baseurlHelper);
            html = AnyBalance.requestGet(baseurlHelper + "account-status.aspx", addHeaders({Referer: g_baseurl}));
        }

        redirect = getParam(html, null, null, /<form .*?id="redirect-form".*?action="[^"]*?([^\/\.]+)\.mts\.ru/);
        if (redirect) {
            //Неправильный регион. Умный мтс нас редиректит
            //Только эта скотина не всегда даёт правильную ссылку, иногда даёт такую, которая требует ещё редиректов
            //Поэтому приходится вычленять из ссылки непосредственно нужный регион
            if (region_aliases[redirect])
                redirect = region_aliases[redirect];
            if (!regionsOrdinary[redirect])
                throw new AnyBalance.Error("МТС перенаправила на неизвестный регион: " + redirect);

            baseurlHelper = regionsOrdinary[redirect];
            AnyBalance.trace("Redirected, now trying to enter selfcare at address: " + baseurlHelper);
            html = AnyBalance.requestPost(baseurlHelper + "logon.aspx", {
                wasRedirected: '1',
                submit: 'Go'
            }, g_headers);
        }

    } catch (e) {
        AnyBalance.trace('Не удалось перейти из лк в интернет-помощник: ' + e.message);
    }

    return {html: html, baseurlHelper: baseurlHelper};
}

function login(result){
    AnyBalance.setDefaultCharset('utf-8');

    var prefs = AnyBalance.getPreferences(), html;

    if (prefs.password) {
        html = loginWithPassword();
    } else {
        var ret = loginWithoutPassword();
        html = ret.html;
        result.password = ret.password;
    }
    return html;
}

function processInfoLK(html, result){
    if(!AnyBalance.isAvailable('balance', 'info.phone', 'info.fio', 'tariff'))
        return;

    try {
        var info = getLKJson(html, true);
        result.info = {};

        AnyBalance.trace(info);
        info = getJson(info);
        //AnyBalance.trace(JSON.stringify(info));
        for (var i = 0; i < info.genericRelations.length; i++) {
            var rel = info.genericRelations[i];
            if (isset(rel.target.balance))
                getParam(rel.target.balance + '', result, 'balance', null, null, parseBalanceRound);

            if (isset(rel.target.productResources) && isset(rel.target.productResources[0]))
                getParam(rel.target.productResources[0].product.name['ru-RU'], result, 'tariff');

            if (isset(rel.target.address))
                getParam(rel.target.address + '', result.info, 'info.phone', null, replaceNumber);

            if (isset(rel.target.displayNameNat))
                getParam(rel.target.displayNameNat + '', result.info, 'info.fio');
        }
    } catch (e) {
        AnyBalance.trace('Не удалось получить данные о пользователе, скорее всего, виджет временно недоступен... ' + e.message);
    }
}

function processBonusLK(result){
    try {
        if (AnyBalance.isAvailable('bonus')) {
            info = AnyBalance.requestGet('https://bonus.ssl.mts.ru/api/user/part/Status', addHeaders({
                Referer: 'https://bonus.ssl.mts.ru/',
                'X-Requested-With': 'XMLHttpRequest'
            }));
            var json = getJson(info);
            if (json.status != 'registered') {
                AnyBalance.trace('Бонус не может быть получен: ' + info);
            } else {
                info = AnyBalance.requestGet('https://bonus.ssl.mts.ru/api/user/part/Points', addHeaders({
                    Referer: 'https://bonus.ssl.mts.ru/',
                    'X-Requested-With': 'XMLHttpRequest'
                }));
                var json = getJson(info);
                getParam(json.points, result, 'bonus');
            }
        }
    } catch (e) {
        AnyBalance.trace('Не удалось получить данные о бонусах... ' + e.message);
    }
}

function processTrafficLK(result){
    if (isAvailable('remainders.traffic_left_mb', 'remainders.traffic_used_mb', 'remainders.traffic_left_till')) {
        if(!result.remainders)
            result.remainders = {};
        var remainders = result.remainders;

        AnyBalance.trace('Запросим трафик...');
        try {
            for (var i = 0; i < 3; i++) {
                AnyBalance.trace('Пробуем получить трафик, попытка: ' + (i + 1));

                var html = AnyBalance.requestGet(g_baseurl, addHeaders({Referer: g_baseurl}));

                var widgetJson = getParam(html, null, null, /myInternet.\w+\s*=\s*(\{[\s\S]*?\});/i, null, getJsonEval);
                var href = widgetJson.widgetDataUrl;
                if (!href)
                    throw new AnyBalance.Error('Не удалось найти ссылку на трафик.');

                info = AnyBalance.requestGet(g_baseurl + href + '&_=' + new Date().getTime(), addHeaders({
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': '*/*',
                    'Referer': g_baseurl + '/'
                }));
                AnyBalance.trace(info);

                if (!info) {
                    AnyBalance.trace('Сервер вернул ерунду, пробуем еще раз...');
                    continue;
                }
                var json = getJson(info);
                if (json.OptionName != 'null' && isset(json.OptionName)) {
                    AnyBalance.trace('Нашли трафик...');

                    sumParam(json.TrafficLeft + '', remainders, 'remainders.traffic_left_mb', null, null, function (str) {
                        return parseTraffic(str, 'kb');
                    }, aggregate_sum);
                    sumParam(json.TrafficConsumed + '', remainders, 'remainders.traffic_used_mb', null, null, function (str) {
                        return parseTraffic(str, 'kb');
                    }, aggregate_sum);
                    getParam(json.PackageUpdated + '', remainders, 'remainders.traffic_left_till', null, null, parseDateISO);
                    break;
                } else {
                    AnyBalance.trace('Трафика нет...');
                }
            }
        } catch (e) {
            AnyBalance.trace('Не удалось получить трафик: ' + e.message);
        }
    }
}


function mainLK(html, result) {
    AnyBalance.trace("Мы в личном кабинете...");

    if (!isAnotherNumber()) {
        processInfoLK(html, result);
        processBonusLK(result);
        processTrafficLK(result);
    } else {
        AnyBalance.trace('Пропускаем получение данных из ЛК, если требуется информация по другому номеру');
    }

    if (isAnotherNumber() || isAvailableStatus()) {
        var ret = followIHLink();
        html = ret.html;

        if (!isInOrdinary(html)) { //Тупой МТС не всегда может перейти из личного кабинета в интернет-помощник :(
            var error = getElement(html, /<div[^>]+class="b(?:-page)?_error"[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
            throw new AnyBalance.Error('Ошибка перехода в интернет-помощник: ' + error);
        }

        fetchOrdinary(html, ret.baseurlHelper, result);
    }
}

function sleep(delay) {
    AnyBalance.trace('Sleeping ' + delay + ' ms');
    AnyBalance.sleep(delay);
}

function parseBalanceRound(str) {
    var val = parseBalance(str);
    if (isset(val))
        val = Math.round(val * 100) / 100;
    return val;
}

function loginWithoutPassword(){
    AnyBalance.trace("Entering lk without password...");

    var prefs = AnyBalance.getPreferences();

    checkEmpty(!prefs.password || /^\w{6,26}$/.test(prefs.password), 'Желаемый пароль должен содержать от 6 до 26 символов');
    if (prefs.password) {
        checkEmpty(/^[a-zA-Z0-9]+$/.test(prefs.password) && /[a-z]/.test(prefs.password) && /[A-Z]/.test(prefs.password) && /[0-9]/.test(prefs.password),
            'Желаемый пароль должен состоять только из латинских букв и цифр и должен содержать хотя бы одну строчную букву, заглавную букву и цифру');
    }

    var result = {};
    result.login = prefs.login;

    var html, pass;
    try {
        html = enterLK({login: prefs.login, onlyAutomatic: true});
        if (!prefs.password)
            pass = generatePassword();
        if (prefs.password || pass) {
            changePassword(undefined, prefs.password || pass);
        }
    } catch (e) {
        AnyBalance.trace('Автоматический вход в кабинет не удался. Пробуем получить пароль через СМС');
        pass = getPasswordBySMS(prefs.login);
        html = enterLK({login: prefs.login, password: pass});
        if (prefs.password && prefs.password != pass) {
            changePassword(pass, prefs.password);
        }
    }

    result.password = prefs.password || pass;
    result.html = html;
    return result;
}

function initialize() {
    var ret = loginWithoutPassword();

    var result = {success: true, __initialization: true};
    result.login = prefs.login;
    result.password = ret.password;

    AnyBalance.setResult(result);
}

function getPasswordBySMS(login) {
    var url = g_baseurlLogin + '/amserver/UI/Login?service=smspassword&srcsvc=lk&goto=http%3A%2F%2Flk.ssl.mts.ru%2F';
    var html = AnyBalance.requestGet(url, g_headers);

    var img = getParam(html, null, null, /<img[^>]+id="kaptchaImage"[^>]*src="data:image\/\w+;base64,([^"]+)/i, null, html_entity_decode);
    var code = AnyBalance.retrieveCode('Для получения пароля к личному кабинету по SMS символы, которые вы видите на картинке.', img, {time: 300000});
    var form = getParam(html, null, null, /<form[^>]+name="Login"[^>]*>([\s\S]*?)<\/form>/i);
    var params = createFormParams(form, function (params, input, name, value) {
        if (name == 'IDToken1')
            value = login;
        if (name == 'IDToken2')
            value = code;
        return value;
    });

    html = AnyBalance.requestPost(url, params, addHeaders({Referer: url}));
    var error = getParam(html, null, null, /var\s+passwordErr\s*=\s*'([^']*)/, replaceSlashes);
    if (error)
        throw new AnyBalance.Error(error);

    var password = AnyBalance.retrieveCode('На номер ' + login + ' выслан пароль к личному кабинету МТС. Введите его в поле ниже. <!--#instruction:{"sms":{"number_in":"3339","regexp_in":"Пароль:\\s*(\\w+)"}}#-->', null, {time: 300000});
    return password;
}

function changePassword(oldPass, newPass) {
    var url = g_baseurlLogin + '/amserver/UI/Login?service=changepassword2014';
    var html = AnyBalance.requestGet(url, g_headers);
    var form = getParam(html, null, null, /<form[^>]+name="Login"[^>]*>[\s\S]*?<\/form>/i);
    if (!form) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось найти форму смены пароля. Сайт изменен?');
    }

    var params = createFormParams(form, function (params, input, name, value) {
        if (name == 'IDToken1')
            value = oldPass;
        if (name == 'IDToken2' || name == 'IDToken3')
            value = newPass;
        return value;
    });

    html = AnyBalance.requestPost(url, params, addHeaders({Referer: url}));
    var lastUrl = AnyBalance.getLastUrl();
    AnyBalance.trace('Password change resulted in: ' + lastUrl);
    if (!/#pass_changed|https:\/\/lk\.ssl\.mts\.ru/i.test(lastUrl)) { //Иногда почему-то сразу на лк переадресовывает
        var error = sumParam(html, null, null, /var\s+(?:old|new|con)passwordErr\s*=\s*'([^']*)/, replaceSlashes, null, aggregate_join);
        if (error)
            throw new AnyBalance.Error(error);

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось сменить пароль на желаемый. Сайт изменен?');
    }

    return newPass;
}

function generatePassword() {
    var pass = String.fromCharCode("A".charCodeAt() + Math.floor(Math.random() * 26));
    pass += String.fromCharCode("0".charCodeAt() + Math.floor(Math.random() * 10));
    for (var i = 0; i < 4; ++i) {
        pass += String.fromCharCode("a".charCodeAt() + Math.floor(Math.random() * 26));
    }
    return pass;
}