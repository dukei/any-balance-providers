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
    'Accept-Language': 'ru,en-US;q=0.8,en;q=0.6',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
    Connection: 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Accept-Encoding': 'gzip, deflate, sdch, br'
//    'If-Modified-Since': null, //Иначе МТС глючит с кешированием...
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
    getParam(html, result, 'tariff', /Тарифный план.*?>([^<]*)/i, replaceTagsAndSpaces);
    // Баланс
    getParam(html, result, 'balance', /<span[^>]*id="customer-info-balance[^>]*>([\s\S]*?)(?:\(|<\/span>)/i, replaceTagsAndSpaces, parseBalance);

    // Телефон
    if(AnyBalance.isAvailable('info.phone')){
        if(!result.info)
            result.info = {};
        getParam(html, result.info, 'info.phone', /Номер:.*?>([^<]*)</i, replaceNumber);
    }

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
    if (AnyBalance.isAvailable('remainders.tourist')) {
        AnyBalance.trace("Fetching accumulated counters...");
        html = AnyBalance.requestGet(baseurl + "accumulated-counters.aspx", g_headers);
        fetchAccumulatedCounters(html, result);
    }
    if (AnyBalance.isAvailable('abonservice', 'info.date_start')) {
        AnyBalance.trace("Fetching paid services...");
        checkIHError(html, result);
        html = AnyBalance.requestGet(baseurl + "product-2-view.aspx", g_headers);
        sumParam(html, result, 'abonservice', /<tr[^>]+class="gm-row-item(?:[\s\S](?!<\/tr>))*?<td[^>]+class="price"[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
    	if(AnyBalance.isAvailable('info.date_start')){
            if(!result.info)
                result.info = {};
            sumParam(html, result.info, 'info.date_start', /<tr[^>]+class="gm-row-item(?:[\s\S](?!<\/tr>))*?<td[^>]+class="grid-date"[^>]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
        }
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

function checkIHError(html, result, forceError) {
    var error = getParam(html, null, null, /<div[^>]+class="b_(?:-page)?error"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    if (error || forceError) {
        var err = 'Ошибка МТС при получения данных из интернет-помощника: ' + (error || 'вероятно, он временно недоступен');
        if(result === true){
            throw new AnyBalance.Error(err);
        }else {
            AnyBalance.trace(err);
            result.were_errors = true;
        }
    }
}

function isAvailableStatus() {
    return AnyBalance.isAvailable('remainders', 'info.licschet', 'info.sim', 'statuslock', 'credit', 'usedinthismonth', 'bonus_balance', 'debt', 'pay_till');
}

function isAvailableIH() {
    return isAvailableStatus() ||
    	AnyBalance.isAvailable('tourist', 'abonservice', 'info.date_start', 'expenses', 'payments', 'detalization') ||
    	(isAvailable('tariff') && !isset(result.tariff)) ||
    	(isAvailable('info.phone') && (!isset(result.info) || !isset(result.info.phone)));
    	
}

function fetchAccumulatedCounters(html, result) {
    AnyBalance.trace("Parsing accumulated counters...");

    checkIHError(html, result);

    if(!result.remainders)
        result.remainders = {};
    getParam(html, result.remainders, 'remainders.tourist', /Счетчик Туристическая СИМ-карта от МТС\.[\s\S]*?<td[^>]+class="counter-value"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
}

function fetchAccountStatus(html, result) {
    AnyBalance.trace("Parsing status...");
    checkIHError(html, result);

   	if(AnyBalance.isAvailable('remainders')){
    	if(!result.remainders)
        	result.remainders = {};

        // Ближайший срок истекания пакета минут
        sumParam(html, result.remainders, 'remainders.min_till', [/мин\.?,?\s*(?:Пакет\s*)?действует до ([^<]*)/ig, /Остаток пакета минут:[^<]*действует до([^<]*)/ig], replaceTagsAndSpaces, parseDate, aggregate_min);
        // Ближайший срок истекания пакета SMS
        sumParam(html, result.remainders, 'remainders.sms_till', /(?:смс|sms)[^<]*[.:,]*\s*(?:Пакет\s*)?действует до ([^<]*)/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
        // Ближайший срок истекания пакета MMS
        sumParam(html, result.remainders, 'remainders.mms_till', /(?:ммс|mms)[^<]*[.:,]*\s*(?:Пакет\s*)?действует до ([^<]*)/ig, replaceTagsAndSpaces, parseDate, aggregate_min);
        // Разделим минуты на МТС Коннект
        html = sumParam(html, result.remainders, 'remainders.min_left_connect', /МТС Connect:\s+остаток\s*([\d\.,]+)[^<]*/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
        // Разделим минуты на МТС и МТС РФ
        html = sumParam(html, result.remainders, 'remainders.min_left_mts_rf', /Оста(?:лось|ток):?\s*([\d\.,]+)\s*(?:бесплатных\s*)?мин[^>]+МТС (?:РФ|России)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
        html = sumParam(html, result.remainders, 'remainders.min_left_mts_rf', /Оста(?:лось|ток)[^<]+мин[^>]+МТС РФ:\s*([\d\.,]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
        //Территория МТС (3000 минут): Осталось 0 минут
        html = sumParam(html, result.remainders, 'remainders.min_left_mts', /Территория МТС.*?: Осталось\s*([\d\.,]+)\s*мин/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
        html = sumParam(html, result.remainders, 'remainders.min_left_mts', /Оста(?:ток|лось):?\s*([\d\.,]+)\s*мин\S*\s*(?:на\s*)?МТС/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
        //Срочный контракт (15%, 25% как 15%): Осталось 0 минут
        html = sumParam(html, result.remainders, 'remainders.min_left', /Срочный контракт.*?: Осталось\s*([\d\.,]+)\s*мин/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
        // Пакет минут
        html = sumParam(html, result.remainders, 'remainders.min_left', /Остаток (?:еже\S+ )?пакета минут:\s*([\d\.,]+)\s*[м\.,<]/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
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
        html = sumParam(html, result.remainders, 'remainders.min_left', /Остаток еже\S+ пакетов\s*(?:минут\s*)?:?\s*([\d\.,]+)\s*мин/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
        // Остаток ежемесячного пакета: 296 мин
        html = sumParam(html, result.remainders, 'remainders.min_left', /Остаток еже\S+ пакета\s*(?:минут\s*)?:?\s*([\d\.,]+)\s*мин/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
        // Остаток ежемесячного пакета: 296
        html = sumParam(html, result.remainders, 'remainders.min_left', /Остаток еже\S+ пакета минут:?\s*([\d\.,]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
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
        html = sumParam(html, result.remainders, 'remainders.min_left', /пакет местных минут[^<]*?:\s*([\d\.,]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
        html = sumParam(html, result.remainders, 'remainders.min_left', /Остаток\s+"[^<]*?([\d\.,]+)\s*мин/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);

        html = sumParam(html, result.remainders, 'remainders.min_left_mezh', /междугородные минуты[^<]*?:\s*([\d\.,]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
        // <li>Остаток пакета "Пакет МГ минут в дом. регионе":13мин МГ</li>
        html = sumParam(html, result.remainders, 'remainders.min_left_mezh', /Пакет МГ[^<]*?([\d\.,]+?)\s*мин/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
        // <li>Остаток пакета "Пакет МГ минут в дом. регионе":13мин МГ</li>
        html = sumParam(html, result.remainders, 'remainders.min_left_mezh', /М2М[^<]*?([\d\.,]+?)\s*мин/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
        
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
        html = sumParam(html, result.remainders, 'remainders.sms_left', /Остаток еже\S+ пакетов\s*:?\s*([\d\.,]+)\s*(?:смс|sms)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
        // Остаток ежемесячного пакета : 98 смс
        html = sumParam(html, result.remainders, 'remainders.sms_left', /Остаток еже\S+ пакета\s*:?\s*([\d\.,]+)\s*(?:смс|sms)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
        // Остаток ежемесячного пакета SMS: 98
        html = sumParam(html, result.remainders, 'remainders.sms_left', /Остаток еже\S+ пакета (?:смс|sms):?\s*([\d\.,]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
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
        // Остаток трафика
        sumParam(html, result.remainders, 'remainders.traffic_left_mb', /(?:Осталось|Остаток)[^\d]*(\d+[\.,]?\d* *([kmgкмг][бb]|байт|bytes))/ig, null, parseTraffic, aggregate_sum);
        //Подбаланс gprs: 49,26 Mb
        sumParam(html, result.remainders, 'remainders.traffic_left_mb', /Подбаланс gprs:[^\d]*(\d+[\.,]?\d*\s*([kmgкмг][бb]|байт|bytes))/ig, null, parseTraffic, aggregate_sum);
        //Подбаланс gprs: 1,17 Mb до 26.11.2013
        sumParam(html, result.remainders, 'remainders.traffic_left_till', [/Подбаланс gprs:[^<]*?[kmgкмг][бb]\s*до\s*([\s\S]*?)<\//ig, /Остаток GPRS-пакета[^<]*[мm][бb][^<]*действует до([^<]*)/ig], null, parseDate, aggregate_min);
        //Остаток бонуса 100 руб
        getParam(html, result.remainders, 'remainders.bonus_balance', /Остаток бонуса:?\s*([\d\.,]+)\s*р/i, replaceTagsAndSpaces, parseBalance);
        //Использовано: 17 мин на МТС России 
        sumParam(html, result.remainders, 'remainders.traffic_used_mb', /Использовано:?\s*(\d+\s*[кkmмгg][бb])/ig, replaceTagsAndSpaces, parseTrafficFromKb, aggregate_sum);
    }
    
    if(AnyBalance.isAvailable('info')){
    	if(!result.info)
        	result.info = {};

        // Лицевой счет
        getParam(html, result.info, 'info.licschet', /№([\s\S]*?)[:<]/, replaceTagsAndSpaces);
        // Симкарта
        getParam(html, result.info, 'info.sim', /Номер SIM-карты:([\s\S]*?)[:<]/, replaceTagsAndSpaces);
    }

    // Сумма по неоплаченным счетам: 786.02 руб. (оплатить до 24.03.2012)
    getParam(html, result, 'debt', /Сумма [^<]*по неоплаченным счетам(?:[\s\S](?!<\/td|<\/p))*?([-\d\.,]+)\s+руб/i, replaceTagsAndSpaces, parseBalance);
    // Сумма по неоплаченным счетам: 786.02 руб. (оплатить до 24.03.2012)
    getParam(html, result, 'pay_till', /оплатить до\s*([\d\.,\/]+)/i, replaceTagsAndSpaces, parseDate);
/*    // Остаток трафика
    getParam(html, result.remainders, 'remainders.traffic_left', /(?:Осталось|Остаток)[^\d]*(\d+[\.,]?\d* *([kmgкмг][бb]|байт|bytes))/i);
    //Подбаланс gprs: 49,26 Mb
    getParam(html, result.remainders, 'remainders.traffic_left', /Подбаланс gprs:[^\d]*(\d+[\.,]?\d*\s*([kmgкмг][бb]|байт|bytes))/i); */

    // Блокировка
    getParam(html, result, 'statuslock', /<(?:p|div)[^>]+class="account-status-lock"[^>]*>([\s\S]*?)<\/(?:p|div)>/i, replaceTagsAndSpaces);
    // Сумма кредитного лимита
    getParam(html, result, 'credit', /(?:Лимит|Сумма кредитного лимита)[\s\S]*?([-\d\.,]+)\s*\(?руб/i, replaceTagsAndSpaces, parseBalance);
    // Расход за этот месяц
    getParam(html, result, 'usedinthismonth', /Израсходовано [^<]*?(?:<[^>]*>)?([\d\.,]+) \(?руб/i, replaceTagsAndSpaces, parseBalance);
}

function isLoggedIn(html) {
    return getParam(html, null, null, /(<meta[^>]*name="lkMonitorCheck")/i);
}

function getLKJson(html, allowExceptions) {
    try {
    	return getLKJson2(html);
    } catch (e) {
        AnyBalance.trace(e.message);
        AnyBalance.trace('Не удалось найти Json с описанием пользователя первым способом, сайт изменен?');
    }

    try {
    	return getLKJson1(html);
    } catch (e) {
        if (allowExceptions) {
            throw e;
        } else {
            AnyBalance.trace(e.message);
            AnyBalance.trace('Не удалось найти Json с описанием пользователя двумя способами, сайт изменен?');
        }
        json = {};
    }

    return {};
}

function getLKJson1(html) {
    var html = AnyBalance.requestGet('https://login.mts.ru/profile/header?ref=https%3A//lk.ssl.mts.ru/&scheme=https&style=2015v2', addHeaders({
    	Referer: g_baseurl + '/'
    }));

    var json = {};
    json.fio = getElement(html, /<div[^>]+b-header_lk__name[^>]*>/i, replaceTagsAndSpaces);
    json.phone_formatted = getElement(html, /<div[^>]+b-header_lk__phone[^>]*>/i, replaceTagsAndSpaces);
    json.phone = replaceAll(json.phone_formatted, [/\+7/, '', /\D/g, '']);
    json.balance = getElement(html, /<div[^>]+b-header_balance[^>]*>/i, replaceTagsAndSpaces, parseBalance);
    if(!json.balance){
    	AnyBalance.trace('Нулевой баланс! Возможно, что-то не так! ' + html);
    }

    if(!json.phone){
    	AnyBalance.trace('Не удаётся получить информацию о текущем пользователе. Сайт изменен?\n' + html);
    }

    return json;
}

function getLKJson2(html) {
    var html = AnyBalance.requestGet('https://oauth.mts.ru/webapi-1.4/customers/@me', addHeaders({
        'X-Requested-With': 'XMLHttpRequest',
        'Authorization': 'Bearer sso_1.0_websso_cookie'
    }));

    var info = getParam(html, null, null, /^\{[\s\S]*?\}$/i, null, getJson);
    if (!info) {
        AnyBalance.trace(html);

        var error = getParam(html, null, null, /<div[^>]+class="red-status"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        if (error)
            throw new AnyBalance.Error(error);

        throw new AnyBalance.Error('Не удалось найти Json с описанием пользователя, сайт изменен?');
    }

    var json = {};
    for (var i = 0; i < info.genericRelations.length; i++) {
        var rel = info.genericRelations[i];
        if (isset(rel.target.balance))
            json.balance = getParam(rel.target.balance + '', null, null, null, null, parseBalanceRound);

        if (isset(rel.target.productResources) && isset(rel.target.productResources[0]))
            json.tariff = rel.target.productResources[0].product.name['ru-RU'];

        if (isset(rel.target.address)){
            json.phone = rel.target.address;
            json.phone_formatted = replaceAll(json.phone, replaceNumber);
        }

        if (isset(rel.target.displayNameNat))
            json.fio = rel.target.displayNameNat;
    }

    if(!json.balance){
    	AnyBalance.trace('Нулевой баланс! Возможно, что-то не так! ' + html);
    }

    return json;
}


function isAnotherNumber() {
    var prefs = AnyBalance.getPreferences();
    return prefs.phone && prefs.phone != prefs.login;
}

/**
	Осуществляет ожидание загрузки личного кабинета (или сайта, переданного в options.baseurl)
*/
function checkLoginState(html, options) {
	var baseurl = (options && options.baseurl) || g_baseurl;
	var referer = AnyBalance.getLastUrl();
/*	var meta = getParam(html, /<META[^>]+http-equiv="refresh"[^>]+content="\d+;URL=([^"]*)"/i, replaceHtmlEntities);
	if(meta){
    	AnyBalance.trace('Meta redirect to ' + meta);
		var _html = AnyBalance.requestGet(baseurl + '/sitesettings/RequireConfig', addHeaders({Referer: referer}));
		_html = AnyBalance.requestGet(baseurl + '/sitesettings/Settings.js', addHeaders({Referer: referer}));
		html = _html;
	}*/

    if (/checkAuthStatus|дождитесь окончания процесса авторизации/i.test(html) || /waitauth/i.test(referer)) {
/*        var json = {}, tries = 20;
        while (json.Data != 'Success' && tries-- > 0) {
            json = AnyBalance.requestGet(baseurl + '/WaitAuth/CheckAuth?_=' + new Date().getTime(), addHeaders({Referer: referer}));
            json = getJson(json);

            if (json.Data == 'PreSuccess'){
            	json = AnyBalance.requestGet(baseurl + '/WaitAuth/CompleteAuth?_=' + new Date().getTime(), addHeaders({Referer: referer}));
            	json = getJson(json);
            	AnyBalance.trace('Received PreSuccess, called CompleteAuth: ' + JSON.stringify(json));
            }

            if (json.Data == 'Success')
                break;
            
            sleep(1000);
        }
        // Если прождали авторизацию, а она так и не произошла, надо об этом явно сообщить
        if (json.Data != 'Success') {
        	AnyBalance.trace('Слишком долго ждали авторизацию: ' + JSON.stringify(json));
            if (options && options.automatic) {
                //Это была попытка автоматического входа. Раз он не получился, давайте попробуем по логину и паролю
                AnyBalance.trace('МТС не пустил нас в ЛК после ожидания авторизации. Ладно, попробуем с логином и паролем войти.');
                return AnyBalance.requestGet(g_baseurlLogin.replace(/\/Login.*<removeme>/, '/Logout', addHeaders({Referer: baseurl})));
            }
            throw new AnyBalance.Error('МТС не пустил нас в ' + baseurl + ' после ожидания авторизации. Это проблема на сайте МТС, как только работа сайта наладится - данные отобразятся.');
        }

        return AnyBalance.requestGet(baseurl, addHeaders({Referer: referer}));
        */
        html = AnyBalance.requestGet(baseurl, addHeaders({Referer: AnyBalance.getLastUrl()}));
    } else {
        return html;
    }
}

function enterLK(options) {
    var loginUrl = g_baseurlLogin + "/amserver/UI/Login?service=lk&goto=" + g_baseurl + '/' + "";

    var html = enterMtsLK(options);

    html = checkLoginState(html, {automatic: true});

    AnyBalance.trace('isLoggedIn(html) = ' + isLoggedIn(html));

    if (isLoggedIn(html)) {
        AnyBalance.trace("Уже залогинены, проверяем, что на правильный номер...");
        //Автоматом залогинились, надо проверить, что на тот номер

        var json = getLKJson(html);

        function logoutMTS(){
            var html = AnyBalance.requestGet(g_baseurlLogin + '/amserver/UI/Logout', g_headers);

            if (isLoggedIn(html)) {
                AnyBalance.trace(html);
                throw new AnyBalance.Error('Не удаётся выйти из личного кабинета, чтобы зайти под правильным номером. Сайт изменен?');
            }

            return html;
        }

        var loggedInMSISDN = json.phone;
        if (!loggedInMSISDN) {
            AnyBalance.trace(html);
            AnyBalance.trace('Не удалось определить текущий номер в кабинете, сайт изменен? Попробуем выйти и зайти с логином-паролем.');
            html = logoutMTS();
        }else if (loggedInMSISDN != options.login) { //Автоматом залогинились не на тот номер
            AnyBalance.trace("Залогинены на неправильный номер: " + loggedInMSISDN + ", выходим");
            html = logoutMTS();
        } else {
            AnyBalance.trace("Залогинены на правильный номер: " + loggedInMSISDN);
        }
    }

    if (!isLoggedIn(html)) {
        if (!options.onlyAutomatic) {
            html = enterMtsLK(joinObjects(options, {html: html, service: 'lk', url: AnyBalance.getLastUrl()}));
            html = checkLoginState(html);
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

    turnOffLoginSMSNotify(html);

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
        baseurlHelper = getParam(IHLink, null, null, /[\s\S]*?selfcare\//i, replaceTagsAndSpaces) || "https://ihelper.mts.ru/selfcare/";
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

    if(login.isLoggedIn){
    	//Если мы уже были в кабинете, то не перелогиниваемся, может это мультипарт получение данных
        html = enterLK({login: prefs.login, onlyAutomatic: true});
    } else if (prefs.password) {
        html = loginWithPassword();
    } else {
        var ret = loginWithoutPassword();
        html = ret.html;
        result.password = ret.password;
    }

    login.isLoggedIn = true;
    return html;
}

function processInfoLK(html, result){
    if(!AnyBalance.isAvailable('balance', 'info.phone', 'info.fio'))
        return;

    try {
        var info = getLKJson(html, true);

        AnyBalance.trace(JSON.stringify(info));
        getParam(info.balance, result, 'balance');
        getParam(info.tariff, result, 'tariff');
        
        if(AnyBalance.isAvailable('info')){
        	if(!result.info)
            	result.info = {};
            getParam(info.phone, result.info, 'info.phone', null, replaceNumber);
            getParam(info.fio, result.info, 'info.fio');
        }
    } catch (e) {
        AnyBalance.trace('Не удалось получить данные о пользователе, скорее всего, виджет временно недоступен... ' + e.message + '\n' + e.stack);
    }
}

function processBonusLK(result){
    try {
    	//Если мы уже вошли в бонус, то логаут из кабинета не получается. 
    	//Впрочем, в реальном использовании провайдера такого быть не должно
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
        AnyBalance.trace('Не удалось получить данные о бонусах... ' + e.message + '\n' + e.stack);
    }
}

function processTraffic(result){
	try{
	    AnyBalance.trace('Пробуем получить трафик из ЛК по API');
	    processTrafficLKApi(result);
	    return;
    } catch (e) {
        AnyBalance.trace('Не удалось получить трафик из ЛК по API: ' + e.message + '\n' + e.stack);
    }
/*
	try{
	    AnyBalance.trace('Пробуем получить трафик из ЛК');
	    processTrafficLK(result);
	    return;
    } catch (e) {
        AnyBalance.trace('Не удалось получить трафик из ЛК: ' + e.message + '\n' + e.stack);
    }
*/
	try{
	    AnyBalance.trace('Пробуем получить трафик из интернет-кабинета');
	    processTrafficInternet(result);
	    return;
    } catch (e) {
        AnyBalance.trace('Не удалось получить трафик из интернет-кабинета: ' + e.message + '\n' + e.stack);
    }
    //Сюда попадаем только если во всех случаях случилась ошибка
    result.were_errors = true;
}

function parseTrafficFromKb(str){
    return parseTraffic(str, 'kb');
}

function keysToLowerCase(obj) {
	function isComplexObject(obj){
		var t = typeof(obj);
    	if (!(t === "object") || obj === null || t === "string" || t === "number" || t === "boolean") {
        	return false;
    	}
    	return true;
    }
    if(!isComplexObject(obj))
    	return obj;
    var keys = Object.keys(obj);
    var n = keys.length;
    var lowKey;
    while (n--) {
        var key = keys[n];
        var key_unchanged = (key === (lowKey = key.toLowerCase()));
        if (key_unchanged && !isComplexObject(obj[key]))
            continue;
        obj[lowKey] = keysToLowerCase(obj[key]);
        if(!key_unchanged)
        	delete obj[key];
    }
    return (obj);
}

function processTrafficH2O(h2oProfile, result){
    AnyBalance.trace('H2O profile: ' + JSON.stringify(h2oProfile));

    var till = typeof (h2oProfile.personalOptionUsage) != 'undefined'
        ? h2oProfile.personalOptionUsage.usageEndDate
        : h2oProfile.traffic.homeNextRotateDate;
    var eatProlong = typeof (h2oProfile.autoStep) != 'undefined' && h2oProfile.autoStep.isActive;
    var available = eatProlong
        ? h2oProfile.autoStep.stepRemainder
        : h2oProfile.traffic.available;
    var consumed = eatProlong
        ? h2oProfile.autoStep.stepQuota - h2oProfile.autoStep.stepRemainder
        : h2oProfile.traffic.consumed;

    var obj = keysToLowerCase(h2oProfile);

    if(!result.remainders)
        result.remainders = {};
    var remainders = result.remainders;

   	sumParam(available + '', remainders, 'remainders.traffic_left_mb', null, null, parseTrafficFromKb, aggregate_sum);
   	sumParam(consumed + '', remainders, 'remainders.traffic_used_mb', null, null, parseTrafficFromKb, aggregate_sum);
   	getParam(till, remainders, 'remainders.traffic_left_till', null, null, parseDateISO);
}

function processTrafficInternet(result){
	var baseurl = 'https://internet.mts.ru';

    if (isAvailable('remainders.traffic_left_mb', 'remainders.traffic_used_mb', 'remainders.traffic_left_till')) {
    	var html = AnyBalance.requestGet(baseurl + '/', addHeaders({Referer: g_baseurl}));
    	html = checkLoginState(html, {baseurl: baseurl});

    	var script = AnyBalance.requestGet(baseurl + '/sitesettings/H2OProfile.js', addHeaders({Referer: baseurl+'/'}));
    	var obj = getJsonObject(script, /_user:(?=\s*\{)/i);
    	processTrafficH2O(obj, result);
    }
}

function processTrafficLKApi(result){
    if (isAvailable('remainders.traffic_left_mb', 'remainders.traffic_used_mb', 'remainders.traffic_left_till')) {
		AnyBalance.trace('Пробуем получить трафик по апи из ЛК..');
		var html = AnyBalance.requestGet('https://oauth.mts.ru/webapi-1.4/api/counters/all', addHeaders({
			Referer: 'https://oauth.mts.ru/wrs-4.1/gadgets/ifr?url=https://oauth.mts.ru/os/mts-my-account-payment/mts-my-account.xml&refresh=86400&lang=ru',
			Authorization: 'Bearer sso_1.0_websso_cookie'
		}));

		var json = getJson(html);
		AnyBalance.trace('Остатки: ' + html);

		var info = json.counters.filter(function(c) { return c.type == 'internet' })[0];
		if(!info)
			throw new Anybalance.Error('Трафик отсутствует в счетчиках');

        if(!result.remainders)
            result.remainders = {};
        var remainders = result.remainders;

		getParam(info.value/info.ratio + info.measBase, remainders, 'remainders.traffic_used_mb', null, null, parseTraffic);
		getParam((info.limit - info.value)/info.ratio + info.measBase, remainders, 'remainders.traffic_left_mb', null, null, parseTraffic);
		getParam(info.expirationTime, remainders, 'remainders.traffic_left_till', null, null, parseDateISO);
	}
}

function processTrafficLK(result){
    if (isAvailable('remainders.traffic_left_mb', 'remainders.traffic_used_mb', 'remainders.traffic_left_till')) {
        if(!result.remainders)
            result.remainders = {};
        var remainders = result.remainders;

        AnyBalance.trace('Запросим трафик...');
        for (var i = 0; i < 3; i++) {
            AnyBalance.trace('Пробуем получить трафик, попытка: ' + (i + 1));
            var html = AnyBalance.requestGet(g_baseurl, addHeaders({Referer: g_baseurl}));

            var widgetUrl = getParam(html, null, null, /'\/miwidgettrafficavailable\/[^']*'/i, null, getJsonEval);
            if (!widgetUrl)
                throw new AnyBalance.Error('Не удалось найти ссылку на трафик.');
            var href = joinUrl(g_baseurl, widgetUrl);

            info = AnyBalance.requestGet(href + '&_=' + new Date().getTime(), addHeaders({
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
    		processTrafficH2O(json.H2OExtended, result);
    		return;
        }
        throw new AnyBalance.Error('Трафик не найден!');
    }
}


function mainLK(html, result) {
    AnyBalance.trace("Мы в личном кабинете...");

    if (!isAnotherNumber()) {
        processInfoLK(html, result);
        processBonusLK(result);
        processTraffic(result);
    } else {
        AnyBalance.trace('Пропускаем получение данных из ЛК, если требуется информация по другому номеру');
    }

    var maxIHTries = 3;
    //Иногда помощник входит не с первого раза почему-то.
    for(var i=0; i<maxIHTries; ++i){
        try{
            if (isAnotherNumber() || isAvailableIH()) {
            	AnyBalance.trace('Попытка входа в интернет-помощник ' + (i+1) + '/' + maxIHTries);
                var ret = followIHLink();
                html = ret.html;
            
                if (!isInOrdinary(html)) //Тупой МТС не всегда может перейти из личного кабинета в интернет-помощник :(
                	checkIHError(html, true, true);
            
                fetchOrdinary(html, ret.baseurlHelper, result);
            }
            break;
        }catch(e){
        	if(isAnotherNumber())
        		throw e; //В случае требования другого номера все данные получаются только из интернет-помощника
            AnyBalance.trace('Не удалось получить данные из ип: ' + e.message + '\n' + e.stack);

        	if(i == maxIHTries-1) //Если попытка последняя, ставим флаг, что были ошибки
            	result.were_errors = true;
        }
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

    var img = getParam(html, 
    	/#captcha-wrapper\s*\{[^}]*background-image:\s*url\(\s*['"]data:image\/\w+;base64,([^'"]*)/i, replaceHtmlEntities);
    if(!img){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось получить капчу. Сайт изменен?');
    }

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
    var url = g_baseurlLogin + '/amserver/UI/Login?service=changepassword2014&ForceAuth=true';
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

function processPayments(baseurl, result) {
    try{
        AnyBalance.trace('Получаем платежи...');

        var html = AnyBalance.requestGet(baseurl + 'payment-full-history.aspx', g_headers);
        checkIHError(html, true);
        var form = getElement(html, /<form[^>]+aspnetForm[^>]*>/i);

        var dt = new Date();
        var dtFrom = new Date(dt.getFullYear()-1, dt.getMonth(), dt.getDate());
        var params = createFormParams(form, function (params, str, name, value) {
            if (/from$/i.test(name))
                return fmtDate(dtFrom);
            if (/to$/i.test(name))
                return fmtDate(dt);

            return value;
        });

        setCsrfCookie(baseurl, html);

        html = AnyBalance.requestPost(baseurl + 'payment-full-history.aspx', params, addHeaders({Referer: AnyBalance.getLastUrl()}));
        checkIHError(html, true);

        var tbl = getElement(html, /<div[^>]+paymentsGridium[^>]*>/i);
        if(!tbl){
            var error = getElement(html, /<div[^>]+panelMessage[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
            if(error && /платежей не было/i.test(error)){
                AnyBalance.trace(error);
                result.payments = [];
                return;
            }else{
                AnyBalance.trace(html);
                throw new AnyBalance.Error('Не найдена таблица платежей. Сайт изменен?');
            }
        }

        tbl = replaceAll(tbl, [/<tfoot[^>]*>[\s\S]*?<\/tfoot>/i, '']);

        result.payments = [];

        var colsDef = {
            date: {
                re: /Дата/i,
                result_func: parseDate
            },
            sum: {
                re: /Сумма/i
            },
            descr: {
                re: /Тип платежа/i,
                result_func: html_entity_decode
            }
        };

        processTable(tbl, result.payments, 'payments.', colsDef);
    }catch(e){
        AnyBalance.trace('Не удалось получить платежи: ' + e.message + '\nStack: ' + e.stack);
    }
}


function turnOffLoginSMSNotify(html){
	var url = g_baseurlLogin + '/amserver/UI/Login?service=setnotify&ForceAuth=true';
	html = AnyBalance.requestGet(url, addHeaders({Referer: g_baseurl + '/settings'}));
	var form = getElements(html, [/<form/ig, /<input[^>]+checkbox[^>]+successfullLogin/i])[0];
	if(!form){
		AnyBalance.trace('Could not find notification form, skipping sms notification check: ' + html);
		return;
	}

	var params = createFormParams(form);
	if(params.successfullLogin){
		AnyBalance.trace('СМС о входе в кабинет включено. Выключаем...');
		delete params.successfullLogin;

		html = AnyBalance.requestPost(url, params, addHeaders({Referer: url}));
		if(/settings_changed/i.test(AnyBalance.getLastUrl())){
			AnyBalance.trace('СМС о входе отключено, чтобы не терзало зря телефон');
		}else{
			AnyBalance.trace('Не удалось отключить смс о входе');
		}
	}else{
		AnyBalance.trace('СМС о входе уже отключено');
	}
}