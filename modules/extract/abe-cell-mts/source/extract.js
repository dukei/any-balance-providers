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

var g_baseurl = 'https://lk.mts.ru';
var g_baseurlLogin = 'https://login.mts.ru';
var g_savedData;

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Language': 'ru-RU,ru;q=0.9',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'If-Modified-Since': null, //Иначе МТС глючит с кешированием...
};

var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function generateUUID(){
	function s4() {
  		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
  	return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

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

        html = sumParam(html, result.remainders, 'remainders.min_left_mezh', /междугородные минуты[^<]*?:\s*([\d\.,]+)/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
        // <li>Остаток пакета "Пакет МГ минут в дом. регионе":13мин МГ</li>
        html = sumParam(html, result.remainders, 'remainders.min_left_mezh', /Пакет МГ[^<]*?([\d\.,]+?)\s*мин/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
        // <li>Остаток пакета "Пакет МГ минут в дом. регионе":13мин МГ</li>
        html = sumParam(html, result.remainders, 'remainders.min_left_mezh', /М2М[^<]*?([\d\.,]+?)\s*мин/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
        // Остаток минут в международном роуминге
        html = sumParam(html, result.remainders, 'remainders.min_left_mezh', /Остаток: (\d+) мин в МНР/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum, true);
        


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
    var prefs = AnyBalance.getPreferences();
    var html = AnyBalance.requestGet('https://auth-lk.ssl.mts.ru/account/is-authorized', addHeaders({
        Referer: 'https://lk.mts.ru/'
    }));
	
    return html === 'true';
 }

function getLKJson(html, allowExceptions) {
    try {
    	return getLKJsonNew(html);
    } catch (e) {
        AnyBalance.trace(e.message);
        AnyBalance.trace('Не удалось найти Json с описанием пользователя первым способом, сайт изменен?');
    }

    try {
    	return getLKJson2(html);
    } catch (e) {
        AnyBalance.trace(e.message);
        AnyBalance.trace('Не удалось найти Json с описанием пользователя вторым способом, сайт изменен?');
    }

    try {
    	return getLKJson1(html);
    } catch (e) {
        if (allowExceptions) {
            throw e;
        } else {
            AnyBalance.trace(e.message);
            AnyBalance.trace('Не удалось найти Json с описанием пользователя тремя способами, сайт изменен?');
        }
        json = {};
    }

    return {};
}

function getLKJsonNew(html) {
	var prefs = AnyBalance.getPreferences();
	
	var html = AnyBalance.requestGet('https://lk.mts.ru/api/login/user-info', addHeaders({
		Accept: 'application/json, text/plain, */*',
		'X-Login': fetchNumber(),
		'X-Requested-With': 'XMLHttpRequest'
	}));
	
	var json = getJson(html);
	var out = {};
	var account = json.userProfile;
	out.fio = account.displayName;
    out.phone_formatted = ('' + account.login).replace(/(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7($1)$2-$3-$4');
    out.phone = '' + account.login;
	out.license = '' + account.accountNumber;
	out.region = '' + account.regionTitle;
//    out.balance = Math.round(account.balance*100)/100; // Здесь баланс неоперативно обновляется
    out.tariff = getParam('' + account.tariff, null, null, /(?:[\s\S]*?-\s)([\s\S]*?)(?:\s\([\s\S]*?)?$/i, replaceTagsAndSpaces);
	
	if(!out.balance){
	    var token = callNewLKApiToken('accountInfo/mscpBalance');
	    var data = callNewLKApiResult(token);
	    
	    out.balance = getParam(Math.round(data.amount*100)/100);
	}

    if(!out.balance){
    	AnyBalance.trace('Нулевой баланс! Возможно, что-то не так! ' + JSON.stringify(data));
    }

    if(!out.phone){
    	AnyBalance.trace('Не удаётся получить информацию о текущем пользователе. Сайт изменен?\n' + html);
    }

    return out;
}

function getLKJson2(html) {
    var html = AnyBalance.requestGet('https://lk.mts.ru/api/login/profile', addHeaders({
    	Referer: g_baseurl + '/',
		'X-Login': fetchNumber()
    }));

    var json = getJson(html);
    var out = {};
	var account = json.account;
    out.fio = json.name;
    out.phone_formatted = ('' + account.phone).replace(/(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7($1)$2-$3-$4');
    out.phone = '' + account.phone;
	out.license = '' + account.number;
	out.region = getParam('' + account.tariff.system, null, null, /([\s\S]*?)(?:\s-\s[\s\S]*?)?$/i, replaceTagsAndSpaces);
//    out.balance = Math.round(json['mobile:balance']*100)/100; // Здесь вообще нет баланса
    out.tariff = '' + account['tariff']["name"];
	
	if(!out.balance){
	    var token = callNewLKApiToken('accountInfo/mscpBalance');
	    var data = callNewLKApiResult(token);
	    
	    out.balance = getParam(Math.round(data.amount*100)/100);
	}
	
    if(!out.balance){
    	AnyBalance.trace('Нулевой баланс! Возможно, что-то не так! ' + JSON.stringify(data));
    }

    if(!out.phone){
    	AnyBalance.trace('Не удаётся получить информацию о текущем пользователе. Сайт изменен?\n' + html);
    }

    return out;
}

function getLKJson1(html) {
    var html = AnyBalance.requestGet('https://login.mts.ru/profile/header?ref=https%3A//lk.mts.ru/&scheme=https&style=2015v2', addHeaders({
    	Referer: g_baseurl + '/',
		'X-Login': fetchNumber()
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
        var json = {Data: {}}, tries = 20;
        while (json.Data.State != 'Success' && tries-- > 0) {
            json = AnyBalance.requestGet(baseurl + '/WaitAuth/CheckAuth?_=' + new Date().getTime(), addHeaders({Referer: referer}));
            if(AnyBalance.getLastStatusCode() == 404){
            	AnyBalance.trace('Проверка загрузки отсутствует, переходим на лк напрямую: ' + baseurl);
		        html = AnyBalance.requestGet(baseurl, addHeaders({Referer: AnyBalance.getLastUrl()}));
		        return html;
            }

            json = getJson(json);

            if (json.Data.State == 'PreSuccess'){
            	json = AnyBalance.requestGet(baseurl + '/WaitAuth/CompleteAuth?_=' + new Date().getTime(), addHeaders({Referer: referer}));
            	json = getJson(json);
            	AnyBalance.trace('Received PreSuccess, called CompleteAuth: ' + JSON.stringify(json));
            }

            if (json.Data.State == 'Success')
                break;
            
            sleep(1000);
        }
        // Если прождали авторизацию, а она так и не произошла, надо об этом явно сообщить
        if (json.Data.State != 'Success') {
        	AnyBalance.trace('Слишком долго ждали авторизацию: ' + JSON.stringify(json));
            if (options && options.automatic) {
                //Это была попытка автоматического входа. Раз он не получился, давайте попробуем по логину и паролю
                AnyBalance.trace('МТС не пустил нас в ЛК после ожидания авторизации. Ладно, попробуем с логином и паролем войти.');
                return AnyBalance.requestGet(g_baseurlLogin.replace(/\/Login.*<removeme>/, '/Logout', addHeaders({Referer: baseurl})));
            }
            throw new AnyBalance.Error('МТС не пустил нас в ' + baseurl + ' после ожидания авторизации. Это проблема на сайте МТС, как только работа сайта наладится - данные отобразятся.');
        }

        return AnyBalance.requestGet(baseurl, addHeaders({Referer: referer}));
    } else {
        return html;
    }
}

function enterLK(options) {
    var html = enterMtsLK(options);

    html = checkLoginState(html, {automatic: true});
	
	AnyBalance.trace('isLoggedIn(html) = ' + isLoggedIn(html));
	
	if (/no-config&arg=newsession/i.test(AnyBalance.getLastUrl())) { // Проверяем на альтернативный вход UI
        enterLKUI(html, options);
    }
	
	if (!isLoggedIn(html)) {
        AnyBalance.trace('Требуется дологиниться')
        html = AnyBalance.requestGet('https://lk.mts.ru/api/Access/user-verification', addHeaders({Referer: g_baseurl + '/'}));
    }

/*  if (isLoggedIn(html)) { // Процедура больше не требуется, переключение на дополнительный номер выполняется другим способом
        AnyBalance.trace("Уже залогинены, проверяем, что на правильный номер...");
        //Автоматом залогинились, надо проверить, что на тот номер

        var json = getLKJson(html);

        function logoutMTS(){
            var html = AnyBalance.requestGet(g_baseurlLogin + '/amserver/UI/Logout?goto=https://lk.mts.ru/auth/account/login?goto=https://lk.mts.ru', g_headers);

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
    }*/
	
    if (!isLoggedIn(html)) {
        if (getParam(html, null, null, /(auth-status=0)/i))
            throw new AnyBalance.Error('Неверный логин или пароль. Повторите попытку или получите новый пароль на сайте ' + g_baseurl + '/.', false, true);

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Он изменился или проблемы на сайте.');
    }

    __setLoginSuccessful();

    turnOffLoginSMSNotify();

    return html;
}

function loginWithPassword(){
    AnyBalance.trace("Пробуем войти в личный кабинет...");

    var prefs = AnyBalance.getPreferences();
	
	if(!g_savedData)
        g_savedData = new SavedData('mts', prefs.login);

    g_savedData.restoreCookies();
	
    var html = AnyBalance.requestGet('https://lk.mts.ru/', g_headers); // Надо, чтобы новая кука TS0 установилась
	
	if(!html || AnyBalance.getLastStatusCode() >= 500){
        throw new AnyBalance.Error('Личный кабинет МТС временно недоступен. Попробуйте еще раз позже');
	}

    AnyBalance.trace('isLoggedIn(html) = ' + isLoggedIn(html));
    
	if(!isLoggedIn(html)){
        AnyBalance.trace('Сессия новая. Будем логиниться заново...');
        clearAllCookiesExceptProtection();
        var html = enterLK({login: prefs.login, password: prefs.password, baseurl: 'https://lk.mts.ru', url: 'https://auth-lk.ssl.mts.ru/account/login?goto=https://lk.mts.ru/'});
	}else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
    }
	
	html = AnyBalance.requestGet('https://lk.mts.ru/api/Access/user-verification', addHeaders({Referer: g_baseurl + '/'}));
	AnyBalance.trace('Верификация пользователя: ' + html);

	g_savedData.setCookies();
	g_savedData.save();
	
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
    if(!AnyBalance.isAvailable('balance', 'tariff', 'info.licschet', 'info.region', 'info.phone', 'info.fio'))
        return;

    try {
        var info = getLKJson(html, true);

        if(info)
			AnyBalance.trace(JSON.stringify(info));
        getParam(info.balance, result, 'balance');
        getParam(info.tariff, result, 'tariff');
        
        if(AnyBalance.isAvailable('info')){
        	if(!result.info)
            	result.info = {};
			getParam(info.license, result.info, 'info.licschet');
			getParam(info.region, result.info, 'info.region');
            getParam(info.phone, result.info, 'info.phone', null, replaceNumber);
            getParam(info.fio, result.info, 'info.fio');
        }
    } catch (e) {
        AnyBalance.trace('Не удалось получить данные о пользователе, скорее всего, виджет временно недоступен... ' + e.message + '\n' + e.stack);
    }
}
/*
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
* /
	try{
	    AnyBalance.trace('Пробуем получить трафик из интернет-кабинета');
	    processTrafficInternet(result);
	    return;
    } catch (e) {
        AnyBalance.trace('Не удалось получить трафик из интернет-кабинета: ' + e.message + '\n' + e.stack);
    }
    //Сюда попадаем только если во всех случаях случилась ошибка
    result.were_errors = true;
}*/

function parseTrafficFromKb(str){
    return parseTraffic(str, 'kb');
}

/*
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
                'Accept': '*---/*',
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
*/

function fetchNumber() {
    var prefs = AnyBalance.getPreferences();

    if (prefs.phone && prefs.phone != prefs.login) {
		var number = '7' + prefs.phone;
	} else {
		var number = '7' + prefs.login;
	}
	
	return number;
}

function callNewLKApiToken(verb, params){
	var method = 'GET', params_str = '', headers = g_headers;
	if(params){
		var csrfToken = getCsrfToken(); // Нужен для POST-запросов
		params_str = JSON.stringify(params);
		method = 'POST';
		headers = addHeaders({Accept: 'application/json, text/plain, */*', 'Content-Type': 'application/json', 'Referer': 'https://lk.mts.ru/', 'X-Csrf-Token': csrfToken, 'X-Login': fetchNumber()});
	}else{
		headers = addHeaders({Accept: 'application/json, text/plain, */*', 'Referer': 'https://lk.mts.ru/', 'X-Login': fetchNumber()});
	}
	
	var html = AnyBalance.requestPost('https://lk.mts.ru/api/' + verb, params_str, headers, {HTTP_METHOD: method});
	var json = getJson(html);

	var token = getJson(html);
	if(typeof token !== 'string'){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Неверный ответ API ' + verb);
	}

	return {
		token: token,
		verb: 'api/' + verb
	};
}

function callNewLKApiResult(token){
	for(var i=0; i<30; ++i){
		var html = AnyBalance.requestGet('https://lk.mts.ru/api/longtask/check/' + token.token + '?for=' + token.verb, addHeaders({
			Accept: 'application/json, text/plain, */*',
			'Referer': 'https://lk.mts.ru/',
		    'X-Login': fetchNumber(),
		    'X-Trace-Id': generateUUID()
		}));
		AnyBalance.trace('Ожидание результата ' + token.verb + ' ' + (i+1) + '/' + 30);
		if(AnyBalance.getLastStatusCode() >= 400){
			AnyBalance.trace("Waiting for result error: " + html);
			throw new AnyBalance.Error(html);
		}
		if(!html){
			AnyBalance.sleep(2000);
			continue;
		}
		
		var json = getJson(html);
		AnyBalance.trace('Получен результат ' + token.verb + ' от ' + json.refreshDate);
		return json.data || json;
	}

	throw new AnyBalance.Error('Не удалось получить результат ' + token.verb);
}

function callNewLKApiData(verb, params){ // Для прямых запросов без получения токена
	var method = 'GET', params_str = '', headers = g_headers;
	if(params){
		var csrfToken = getCsrfToken(); // Нужен для POST-запросов
		params_str = JSON.stringify(params);
		method = 'POST';
		headers = addHeaders({Accept: 'application/json, text/plain, */*', 'Content-Type': 'application/json', 'Referer': 'https://lk.mts.ru/', 'X-Csrf-Token': csrfToken, 'X-Login': fetchNumber()});
	}else{
		headers = addHeaders({Accept: 'application/json, text/plain, */*', 'Referer': 'https://lk.mts.ru/', 'X-Login': fetchNumber()});
	}
	
	var html = AnyBalance.requestPost('https://lk.mts.ru/api/' + verb, params_str, headers, {HTTP_METHOD: method});

	var json = getJson(html);
	AnyBalance.trace('Получен результат api/' + verb + ' от ' + json.refreshDate);
	return json.data || json;
}

function processCountersLK(result){
	if(!result.remainders)
        result.remainders = {};
	
	var token = callNewLKApiToken('sharing/counters');
	var data = callNewLKApiResult(token);
	
	if (data.counters && data.counters.length < 3){
		var tries = 0;
		do {
			AnyBalance.trace('Получены не все остатки. Повторная попытка ' + (tries+1) + '/5');
			AnyBalance.sleep(2000);
		    var token = callNewLKApiToken('sharing/counters');
		    var data = callNewLKApiResult(token);
		} while (data.counters.length < 3 && ++ tries < 3);
	}

	for(var i=0; i<data.counters.length; ++i){
		var c = data.counters[i];
		if(/Входящ/i.test(c.name)){ // Для звонков в Беларуси
			AnyBalance.trace('Найден счетчик ' + c.name + ' (' + c.packageType + '). Это посуточный дополнительный пакет. Пропускаем...');
			continue;
	    }
		if(c.isUnlimited){ // Пропускаем безлимитные остатки
			AnyBalance.trace('Найден счетчик ' + c.name + ' (' + c.packageType + '). Это безлимитный пакет. Пропускаем...');
			continue;
	    }
		AnyBalance.trace('Найден счетчик ' + c.name + ' (' + c.packageType + ')');

		if(c.packageType === 'Calling'){
			AnyBalance.trace('Это минуты');
			let del = 1;
			if(c.unitType === 'Second')
				del = 60;
			sumParam(c.deadlineDate, result.remainders, 'remainders.min_till', null, null, parseDateISO, aggregate_min);
			sumParam(c.usedAmount/del, result.remainders, 'remainders.min_local', null, null, parseBalanceSilent, aggregate_sum);
			sumParam(c.totalAmount/del, result.remainders, 'remainders.min_total', null, null, parseBalanceSilent, aggregate_sum);
			sumParam((c.totalAmount - c.usedAmount)/del, result.remainders, 'remainders.min_left', null, null, parseBalanceSilent, aggregate_sum);
		}else if(c.packageType === 'Messaging'){
			AnyBalance.trace('Это сообщения');
			sumParam(c.deadlineDate, result.remainders, 'remainders.sms_till', null, null, parseDateISO, aggregate_min);
			sumParam(c.usedAmount, result.remainders, 'remainders.sms_used', null, null, parseBalanceSilent, aggregate_sum);
			sumParam(c.totalAmount, result.remainders, 'remainders.sms_total', null, null, parseBalanceSilent, aggregate_sum);
			sumParam(c.totalAmount - c.usedAmount, result.remainders, 'remainders.sms_left', null, null, parseBalanceSilent, aggregate_sum);
		}else if(c.packageType === 'Internet'){
			AnyBalance.trace('Это трафик');
			sumParam(c.deadlineDate, result.remainders, 'remainders.traffic_left_till', null, null, parseDateISO, aggregate_min);
			sumParam((c.usedAmount) + ' ' + c.unitType, result.remainders, 'remainders.traffic_used_mb', null, null, parseTraffic, aggregate_sum);
			sumParam((c.totalAmount) + ' ' + c.unitType, result.remainders, 'remainders.traffic_total_mb', null, null, parseTraffic, aggregate_sum);
			sumParam((c.usedByAcceptors) + ' ' + c.unitType, result.remainders, 'remainders.traffic_used_by_acceptors_mb', null, null, parseTraffic, aggregate_sum);
			sumParam((c.totalAmount - c.usedAmount) + ' ' + c.unitType, result.remainders, 'remainders.traffic_left_mb', null, null, parseTraffic, aggregate_sum);
		}else{
			AnyBalance.trace('Неизвестный счетчик: ' + JSON.stringify(c));
		}
	}
	
	if (isAvailable('remainders.cashback')) {
	    var token = callNewLKApiToken('cashback/account');
	    var data = callNewLKApiResult(token);
	    
	    getParam(data.balance, result.remainders, 'remainders.cashback');
	}
	
	if (isAvailable(['remainders.statuslock', 'remainders.services', 'remainders.services_free', 'remainders.services_paid', 'remainders.services_abon', 'remainders.services_abon_day'])) {
	    var token = callNewLKApiToken('services/list/active');
	    var data = callNewLKApiResult(token);
	    var status = {
		    Unblocked: 'Номер не блокирован',
		    OnlyInboundCalls: 'Частичная блокировка',
			VoluntaryBlock: 'Добровольная блокировка',
		    BlockDueToInsufficiencyOfMoney: 'Номер заблокирован',
		    Blocked: 'Номер заблокирован'
	    };
	    getParam(status[data.accountBlockStatus]||data.accountBlockStatus, result.remainders, 'remainders.statuslock');
	    getParam(data.services.length, result.remainders, 'remainders.services');
	    getParam(0, result.remainders, 'remainders.services_free');
	    getParam(0, result.remainders, 'remainders.services_paid');
	    getParam(0, result.remainders, 'remainders.services_abon');
		getParam(0, result.remainders, 'remainders.services_abon_day');
	    for(var i=0; i<data.services.length; ++i){
		    var c = data.services[i];

		    if(c.isSubscriptionFee === false || c.primarySubscriptionFee.value === 0){
			    AnyBalance.trace('Найдена бесплатная услуга ' + c.name);
			    sumParam(1, result.remainders, 'remainders.services_free', null, null, parseBalanceSilent, aggregate_sum);
		    }else if(c.isSubscriptionFee === true && c.primarySubscriptionFee.value !== 0){
			    AnyBalance.trace('Найдена платная услуга ' + c.name + ': ' + c.primarySubscriptionFee.quotaPeriodicity + ' ' + c.primarySubscriptionFee.value + ' ₽');
			    sumParam(1, result.remainders, 'remainders.services_paid', null, null, parseBalanceSilent, aggregate_sum);
		        if(c.primarySubscriptionFee.unitOfMeasure !== 'Month'){
					sumParam(c.primarySubscriptionFee.value, result.remainders, 'remainders.services_abon_day', null, null, parseBalanceSilent, aggregate_sum);
                }else{
					sumParam(c.primarySubscriptionFee.value, result.remainders, 'remainders.services_abon', null, null, parseBalanceSilent, aggregate_sum);
                }
		    }else{
			    AnyBalance.trace('Неизвестный тип услуги: ' + JSON.stringify(c));
		    }
	    }
		
		var token = callNewLKApiToken('contentSubscription/list/active'); // Часть услуг МТС отдаёт по доп. запросу, проверяем их наличие
	    var data = callNewLKApiResult(token);
		
		if(data && data.length && data.length > 0){
	        for(var i=0; i<data.length; ++i){
		        var c = data[i];
                
		        sumParam(1, result.remainders, 'remainders.services', null, null, parseBalanceSilent, aggregate_sum);
			    
			    if(c.cost === 0){
			        AnyBalance.trace('Найдена бесплатная услуга ' + c.contentName);
			        sumParam(1, result.remainders, 'remainders.services_free', null, null, parseBalanceSilent, aggregate_sum);
		        }else{
			        AnyBalance.trace('Найдена платная услуга ' + c.contentName + ': ' + c.cost + ' ₽' + c.costInfo);
			        sumParam(1, result.remainders, 'remainders.services_paid', null, null, parseBalanceSilent, aggregate_sum);
		            if(!/30 дней|1 месяц/i.test(c.costInfo)){
					    sumParam(c.cost, result.remainders, 'remainders.services_abon_day', null, null, parseBalanceSilent, aggregate_sum);
                    }else{
					    sumParam(c.cost, result.remainders, 'remainders.services_abon', null, null, parseBalanceSilent, aggregate_sum);
                    }
		        }
	        }
		}else{
			AnyBalance.trace('Не удалось получить список дополнительных услуг. Возможно, они отсутствуют');
		}
    }
	
	if (isAvailable('remainders.credit')) {
	    var token = callNewLKApiToken('creditLimit');
	    var data = callNewLKApiResult(token);
	    
	    getParam(data.currentCreditLimitValue, result.remainders, 'remainders.credit');
	}
	
	if (isAvailable(['remainders.cashback_mts', 'remainders.cashback_mts_pending', 'remainders.cashback_mts_burning', 'remainders.cashback_mts_burning_date', 'remainders.premium_state'])) {
		processCashbackLK(result);
	}
	
	if (isAvailable('messages.total_msg', 'messages.unread_msg')) {
	    processMessagesLK(result);
	}
	
	if (isAvailable(['expenses.traffic_used_total_mb', 'expenses.usedinthismonth', 'expenses.usedinprevmonth', 'expenses.abonservice', 'expenses.refill'])) {
	    processExpensesLK(result);
	}
	
	if (isAvailable(['payments.sum', 'payments.date', 'payments.descr'])) {
	    processTransactionsLK(result);
	}
	
	if (isAvailable('tariff_abon')) {
	    processTariffAbonLK(result);
	}
}

function getCsrfToken(){
	var html = AnyBalance.requestGet('https://lk.mts.ru/api/login/refreshCsrfToken', addHeaders({
		Accept: 'application/json, text/plain, */*',
		'Referer': 'https://lk.mts.ru/',
		'X-Login': fetchNumber()
	}));

    var csrfToken = AnyBalance.getLastResponseHeader('X-Refresh-Csrf-Token');
	if(!csrfToken)
		AnyBalance.trace('Не удалось получить csrfToken');
	
	return csrfToken;
}

function processCashbackLK(result){
	if(!result.remainders)
        result.remainders = {};
	
	var html = AnyBalance.requestGet('https://login.mts.ru/amserver/rest/v1/cashback', g_headers);

	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	getParam(json.cashBackValue, result.remainders, 'remainders.cashback_mts');
	getParam(json.pendingCashBackValue, result.remainders, 'remainders.cashback_mts_pending');
	if(json.expiringCashBack){
	    getParam(json.expiringCashBack.expiringCashBackValue, result.remainders, 'remainders.cashback_mts_burning');
	    getParam(json.expiringCashBack.expiringCashBackDate, result.remainders, 'remainders.cashback_mts_burning_date', null, null, parseDateISO);
	}
	var premStatus = {PREMIUM: 'Активна', NO_PREMIUM: 'Не активна'};
	getParam(premStatus[json.premiumStatus]||json.premiumStatus, result.remainders, 'remainders.premium_state');
}

function processMessagesLK(result){
	if(!result.messages)
        result.messages = {};
	
	var html = AnyBalance.requestGet('https://login.mts.ru/amserver/rest/ums/v1/messages?product_name=mtsprofile.web', g_headers);

	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	if (json.data && json.data.products && json.data.products.length > 0) {
		for(var i=0; json.data.products && i<json.data.products.length; ++i){
			var product = json.data.products[i];
			sumParam(product.msg_count, result.messages, 'messages.total_msg', null, null, parseBalanceSilent, aggregate_sum);
			sumParam(product.unread_msg_quantity, result.messages, 'messages.unread_msg', null, null, parseBalanceSilent, aggregate_sum);
		}
    }else{
		AnyBalance.trace('Не удалось получить данные по уведомлениям');
	}
}

function processExpensesLK(result){
	if(!result.expenses)
        result.expenses = {};

    var dt = new Date();
	var dateFrom = dt.getFullYear() + '-' + n2(dt.getMonth()+1) + '-' + '01' + 'T00:00:00+03:00';
	var dateTo = dt.getFullYear() + '-' + n2(dt.getMonth()+1) + '-' + n2(dt.getDate()) + 'T23:59:59+03:00';
	
	if(isAvailable('expenses.traffic_used_total_mb')){
	    var transactions = [];
		var pageIndex = 1;
		var pageTotal = 1;
		do {
		    try{
			    html = AnyBalance.requestPost('https://federation.mts.ru/graphql', JSON.stringify({
                    "operationName": "GetExpensesInfoQueryInput",
                    "variables": {
                        "pageIndex": pageIndex,
                        "filter": {
                            "dateFrom": dateFrom,
                            "dateTo": dateTo,
                            "showFree": true,
                            "tabType": null,
                            "categoryId": "mobile_internet",
                            "textSearch": "",
                            "transactionsDirection": null,
                            "cashbackType": "ALL"
                        }
                    },
                    "query": "query GetExpensesInfoQueryInput($pageIndex: Int!, $filter: TransactionsFilterInput!) {\n  transactionsByFilter(input: {pageIndex: $pageIndex, filter: $filter}) {\n    transactions {\n      name\n      type\n      subtitle\n      dateTime\n      unitValue\n      value\n      direction\n      amount\n      icon\n      darkIcon\n      description\n      productType\n      globalCode\n      actionLabel\n      hints\n      cashbackInfo {\n        amount\n        direction\n        __typename\n      }\n      chargePeriod {\n        dateFrom\n        dateTo\n        __typename\n      }\n      __typename\n    }\n    totalPages\n    __typename\n  }\n}"
                }), addHeaders({
		            'Content-Type': 'application/json',
                    'Referer': g_baseurl + '/',
		            'X-Client-Id': 'LK',
		            'X-Login': fetchNumber()
	            }));
	            
	            var json = getJson(html);
				
				if(json.data && json.data.transactionsByFilter){
				    pageTotal = json.data.transactionsByFilter.totalPages;
				    transactions = transactions.concat(json.data.transactionsByFilter.transactions);
				}
	        }catch(e){
				throw new AnyBalance.Error('Ошибка получения данных по общему расходу трафика: ' + e.message);
            }
		} while (true && (++ pageIndex < (pageTotal +1)));
		
		if(transactions && transactions.length > 0){
			AnyBalance.trace('Найдено записей по общему расходу трафика: ' + transactions.length);
			for(var i=0; i<transactions.length; ++i){
		        var t = transactions[i];
			    
				if(t.type !== 'Network' || /Бесплатные интернет-ресурсы МТС/i.test(t.name)) // Пропускаем сервисные пометки
					continue;
				
			    sumParam(t.value + ' ' + t.unitValue, result.expenses, 'expenses.traffic_used_total_mb', null, null, parseTraffic, aggregate_sum);
			}
		}else{
		    AnyBalance.trace('Не удалось получить данные по общему расходу трафика');
	    }
	}
	
	if (isAvailable(['expenses.usedinthismonth', 'expenses.abonservice', 'expenses.refill'])) {
	    try{
	        html = AnyBalance.requestPost('https://federation.mts.ru/graphql', JSON.stringify({
                "operationName": "GetExpensesInfoBaseQueryInput",
                "variables": {
                    "pageIndex": 1,
                    "filter": {
                        "dateFrom": dateFrom,
                        "dateTo": dateTo,
                        "showFree": false,
                        "tabType": null,
                        "categoryId": null,
                        "textSearch": "",
                        "transactionsDirection": null,
                        "cashbackType": "ALL"
                    }
                },
                "query": "query GetExpensesInfoBaseQueryInput($pageIndex: Int!, $filter: TransactionsFilterInput!) {\n  transactionsByFilter(input: {pageIndex: $pageIndex, filter: $filter}) {\n    totalInfo {\n      currency\n      incomeAmount\n      outcomeAmount\n      cashback {\n        incomeAmount\n        outcomeAmount\n        __typename\n      }\n      period {\n        dateFrom\n        dateTo\n        __typename\n      }\n      __typename\n    }\n    categories {\n      alias\n      value\n      name\n      color\n      amount\n      percentage\n      __typename\n    }\n    totalPages\n    transactions {\n      name\n      type\n      subtitle\n      dateTime\n      unitValue\n      value\n      direction\n      amount\n      icon\n      darkIcon\n      description\n      productType\n      globalCode\n      actionLabel\n      hints\n      cashbackInfo {\n        amount\n        direction\n        __typename\n      }\n      chargePeriod {\n        dateFrom\n        dateTo\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}"
            }), addHeaders({
		        'Content-Type': 'application/json',
                'Referer': g_baseurl + '/',
		        'X-Client-Id': 'LK',
		        'X-Login': fetchNumber()
	        }));
	        
	        var json = getJson(html);
	        
	        AnyBalance.trace(JSON.stringify(json));
	        
	        var data = json.data;
	        
	        if(data.transactionsByFilter && data.transactionsByFilter.categories && data.transactionsByFilter.categories.length > 0){
		        for(var i=0; data.transactionsByFilter.categories && i<data.transactionsByFilter.categories.length; ++i){
			        var categorie = data.transactionsByFilter.categories[i];
			        AnyBalance.trace('Найдена категория расходов "' + categorie.name + '": ' + categorie.amount + ' ₽');
			        
				    sumParam(categorie.amount, result.expenses, 'expenses.abonservice', null, null, parseBalanceSilent, aggregate_sum);
		        }
            }else{
		        AnyBalance.trace('Не удалось получить данные по категориям расходов за этот месяц');
	        }
	        
	        if(data.transactionsByFilter && data.transactionsByFilter.totalInfo){
		        getParam(data.transactionsByFilter.totalInfo.incomeAmount, result.expenses, 'expenses.refill');
		        getParam(data.transactionsByFilter.totalInfo.outcomeAmount, result.expenses, 'expenses.usedinthismonth');
	        }else{
		        AnyBalance.trace('Не удалось получить сводные данные по расходам за этот месяц');
	        }
		}catch(e){
            AnyBalance.trace('Ошибка получения данных по расходам за этот месяц: ' + e.message);
        }
	}
	
	if(isAvailable('expenses.usedinprevmonth')){
	    var dt = new Date();
	    var dtPrev = new Date(dt.getFullYear(), dt.getMonth(), 0);
	    var dateFromPrev = dtPrev.getFullYear() + '-' + n2(dtPrev.getMonth()+1) + '-' + '01' + 'T00:00:00+03:00';
	    var dateToPrev = dtPrev.getFullYear() + '-' + n2(dtPrev.getMonth()+1) + '-' + n2(dtPrev.getDate()) + 'T23:59:59+03:00';
	
	    try{
	        html = AnyBalance.requestPost('https://federation.mts.ru/graphql', JSON.stringify({
                "operationName": "GetExpensesInfoBaseQueryInput",
                "variables": {
                    "pageIndex": 1,
                    "filter": {
                        "dateFrom": dateFromPrev,
                        "dateTo": dateToPrev,
                        "showFree": false,
                        "tabType": null,
                        "categoryId": null,
                        "textSearch": "",
                        "transactionsDirection": null,
                        "cashbackType": "ALL"
                    }
                },
                "query": "query GetExpensesInfoBaseQueryInput($pageIndex: Int!, $filter: TransactionsFilterInput!) {\n  transactionsByFilter(input: {pageIndex: $pageIndex, filter: $filter}) {\n    totalInfo {\n      currency\n      incomeAmount\n      outcomeAmount\n      cashback {\n        incomeAmount\n        outcomeAmount\n        __typename\n      }\n      period {\n        dateFrom\n        dateTo\n        __typename\n      }\n      __typename\n    }\n    categories {\n      alias\n      value\n      name\n      color\n      amount\n      percentage\n      __typename\n    }\n    totalPages\n    transactions {\n      name\n      type\n      subtitle\n      dateTime\n      unitValue\n      value\n      direction\n      amount\n      icon\n      darkIcon\n      description\n      productType\n      globalCode\n      actionLabel\n      hints\n      cashbackInfo {\n        amount\n        direction\n        __typename\n      }\n      chargePeriod {\n        dateFrom\n        dateTo\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}"
            }), addHeaders({
		        'Content-Type': 'application/json',
                'Referer': g_baseurl + '/',
		        'X-Client-Id': 'LK',
		        'X-Login': fetchNumber()
	        }));
	        
	        var json = getJson(html);
	        
	        AnyBalance.trace(JSON.stringify(json));
	        
	        var data = json.data;
	        
	        if (data.transactionsByFilter && data.transactionsByFilter.totalInfo) {
		        getParam(data.transactionsByFilter.totalInfo.incomeAmount, result.expenses, 'expenses.refillinprevmonth');
		        getParam(data.transactionsByFilter.totalInfo.outcomeAmount, result.expenses, 'expenses.usedinprevmonth');
	        }else{
		        AnyBalance.trace('Не удалось получить сводные данные по расходам за прошлый месяц');
	        }
		}catch(e){
            AnyBalance.trace('Ошибка получения данных по расходам за прошлый месяц: ' + e.message);
        }
	}
}

function processTransactionsLK(result){
	if(!result.payments)
        result.payments = {};
	
	var dt = new Date();
	var dtHalf = new Date(dt.getFullYear(), dt.getMonth()-6, dt.getDate());
	var dateFromHalf = dtHalf.getFullYear() + '-' + n2(dtHalf.getMonth()+1) + '-' + n2(dtHalf.getDate()) + 'T00:00:00+03:00';
	var dateToHalf = dt.getFullYear() + '-' + n2(dt.getMonth()+1) + '-' + n2(dt.getDate()) + 'T23:59:59+03:00';
	
	try{
	    html = AnyBalance.requestPost('https://federation.mts.ru/graphql', JSON.stringify({
            "operationName": "GetExpensesInfoBaseQueryInput",
            "variables": {
                "pageIndex": 1,
                "filter": {
                    "dateFrom": dateFromHalf,
                    "dateTo": dateToHalf,
                    "showFree": false,
                    "tabType": "INCOME",
                    "categoryId": null,
                    "textSearch": "",
                    "transactionsDirection": null,
                    "cashbackType": "ALL"
                }
            },
            "query": "query GetExpensesInfoBaseQueryInput($pageIndex: Int!, $filter: TransactionsFilterInput!) {\n  transactionsByFilter(input: {pageIndex: $pageIndex, filter: $filter}) {\n    totalInfo {\n      currency\n      incomeAmount\n      outcomeAmount\n      cashback {\n        incomeAmount\n        outcomeAmount\n        __typename\n      }\n      period {\n        dateFrom\n        dateTo\n        __typename\n      }\n      __typename\n    }\n    categories {\n      alias\n      value\n      name\n      color\n      amount\n      percentage\n      __typename\n    }\n    totalPages\n    transactions {\n      name\n      type\n      subtitle\n      dateTime\n      unitValue\n      value\n      direction\n      amount\n      icon\n      darkIcon\n      description\n      productType\n      globalCode\n      actionLabel\n      hints\n      cashbackInfo {\n        amount\n        direction\n        __typename\n      }\n      chargePeriod {\n        dateFrom\n        dateTo\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}"
        }), addHeaders({
		    'Content-Type': 'application/json',
            'Referer': g_baseurl + '/',
		    'X-Client-Id': 'LK',
		    'X-Login': fetchNumber()
	    }));
	    
	    var json = getJson(html);
	}catch(e){
        AnyBalance.trace('Ошибка получения данных по транзакциям за полгода: ' + e.message);
		return;
    }
	
	AnyBalance.trace(JSON.stringify(json));
	
	var data = json.data;
	
	if(data.transactionsByFilter && data.transactionsByFilter.transactions && data.transactionsByFilter.transactions.length > 0){
		AnyBalance.trace('Найдено транзакций: ' + data.transactionsByFilter.transactions.length);
		for(var i=0; data.transactionsByFilter.transactions && i<data.transactionsByFilter.transactions.length; ++i){
			var transaction = data.transactionsByFilter.transactions[i];
            getParam(transaction.amount, result.payments, 'payments.sum');
			getParam(transaction.dateTime, result.payments, 'payments.date', null, null, parseDateISO);
			getParam(transaction.name, result.payments, 'payments.descr');
            break;
		}
    }else{
		AnyBalance.trace('Не удалось получить данные по последней транзакции');
	}
}

function processTariffAbonLK(result){
	try{
	    html = AnyBalance.requestPost('https://federation.mts.ru/graphql', JSON.stringify({
            "operationName": "GetProductsTariffInfo",
            "variables": {
                "screenName": "default"
            },
            "query": "query GetProductsTariffInfo($screenName: String!) {\n  tariffInfo(input: {screenName: $screenName}) {\n    name\n    alias\n    tariffPricesInfo {\n      mainPrice {\n        price\n        basePrice\n        date\n        descriptionPrice\n        __typename\n      }\n      discounts {\n        value\n        dateTo\n        description\n        __typename\n      }\n      __typename\n    }\n    tariffType\n    industryCode\n    tariffManage\n    tariffPaymentType\n    tariffContent {\n      tariffButton\n      tariffSettingUrl\n      autoconvergent {\n        widgetMobile\n        hintBadge\n        badge\n        __typename\n      }\n      familyGroup {\n        addUser\n        addUserUrl\n        __typename\n      }\n      recommendedAmount {\n        title\n        amount\n        text\n        icon\n        modalSheet {\n          text\n          buttons {\n            text\n            url\n            __typename\n          }\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    tariffSigns {\n      key\n      value\n      __typename\n    }\n    __typename\n  }\n}"
        }), addHeaders({
		    'Content-Type': 'application/json',
            'Referer': g_baseurl + '/',
		    'X-Client-Id': 'LK',
		    'X-Login': fetchNumber()
	    }));
	    
	    var json = getJson(html);
	}catch(e){
        AnyBalance.trace('Ошибка получения данных по тарифу: ' + e.message);
		return;
    }
	
	AnyBalance.trace(JSON.stringify(json));
	
	var data = json.data;
	
	if(data.tariffInfo && data.tariffInfo.tariffPricesInfo && data.tariffInfo.tariffPricesInfo.mainPrice && data.tariffInfo.tariffPricesInfo.mainPrice.price){
		getParam(data.tariffInfo.tariffPricesInfo.mainPrice.price, result, 'tariff_abon', null, null, parseBalance);
    }else{
		AnyBalance.trace('Не удалось получить данные по абонплате по тарифу');
	}
}

function mainLK(html, result) {
	var prefs = AnyBalance.getPreferences();
    AnyBalance.trace("Мы в личном кабинете...");

	if (isAnotherNumber()) {
        AnyBalance.trace('Пробуем переключиться на номер ' + prefs.phone);
		var html = AnyBalance.requestGet('https://lk.mts.ru/api/login/profile', addHeaders({
    	    Referer: g_baseurl + '/',
			'X-Login': '7' + prefs.phone
        }));
        
        var json = getJson(html);
		
		var slaves = json.slaves;
	    if(slaves.length < 1){
		    AnyBalance.trace('У логина ' + prefs.login + ' нет ни одного прикрепленного номера');
		}else{
			var account;
	        for(var i=0; i<slaves.length; ++i){
		        var slave = slaves[i];
	            AnyBalance.trace('Найден номер ' + slave.phone);
	            if(!account && (!prefs.phone || endsWith(slave.phone, prefs.phone))){
	    	        AnyBalance.trace('Выбран номер ' + slave.phone);
			        account = slave;
	   	        }
	        }
            
	        if(!account)
		        throw new AnyBalance.Error('Не удалось переключиться на номер ' + prefs.phone + '. Вероятно, он не принадлежит логину ' + prefs.login);
			
			var accId = account.id; // id аккаунта/номера для переключения
	        var csrfToken = getCsrfToken(); // Для переключения номера нужен новый токен csrf
			
			html = AnyBalance.requestPost('https://auth-lk.ssl.mts.ru/account/switch/' + accId, null, addHeaders({
				'Content-Type': 'application/json',
                Referer: g_baseurl + '/',
				'X-Csrf-Token': csrfToken,
				'X-Login': '7' + prefs.login
		    }));
			
			var tries = 5;
            while (!/"loginStatus":\s*?"Success"/i.test(html) && tries-- > 0) {
			    html = AnyBalance.requestGet('https://lk.mts.ru/api/login/user-info', addHeaders({
		            Accept: 'application/json, text/plain, */*',
		            'X-Login': fetchNumber(),
		            'X-Requested-With': 'XMLHttpRequest'
	            }));
				
				if (/"loginStatus":\s*?"Success"/i.test(html))
                    break;
                
                sleep(2000);
            }
			
			if (!/"loginStatus":\s*?"Success"/i.test(html)) {
				AnyBalance.trace(html);
			    throw new AnyBalance.Error('Не удалось переключиться на другой номер. Сайт изменен?');
			} else {
				AnyBalance.trace('Успешно переключились на номер ' + prefs.phone);
				html = AnyBalance.requestGet('https://lk.mts.ru/api/Access/user-verification', addHeaders({
					Referer: g_baseurl + '/',
					'X-Login': '7' + prefs.phone
				}));
	            AnyBalance.trace('Верификация пользователя: ' + html);
			}
		}		
    }
    
	processInfoLK(html, result);
    try{
    	processCountersLK(result);
    }catch(e){
    	AnyBalance.trace("Ошибка получения остатков из кабинета. Попробуйте ещё раз позднее. Ошибка: " + e.message);
		result.were_errors = true;
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
        html = enterLK({login: prefs.login, password: pass, baseurl: 'https://lk.mts.ru', url: 'http://login.mts.ru/amserver/UI/Login?service=lk&goto=http%3A%2F%2Flk.mts.ru%2F'});
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
    var url = g_baseurlLogin + '/amserver/UI/Login?service=smspassword&srcsvc=lk&goto=https%3A%2F%2Flk.ssl.mts.ru%2F';
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

function turnOffLoginSMSNotify(){
    var html = AnyBalance.requestGet('https://profile.mts.ru/account', addHeaders({Referer: 'https://login.mts.ru/'}));
	var _next = getParam(html, /\/_next\/static\/([\d\S]*?)\/_buildManifest\.js/i, replaceHtmlEntities);
	if(!html || !_next){
		AnyBalance.trace('Не удалось получить идентификатор страницы настроек безопасности. Пропускаем проверку способа входа');
		return;
	}
	
	html = AnyBalance.requestGet('https://profile.mts.ru/_next/data/' + _next + '/account/safety.json', addHeaders({Accept: '*/*', Referer: 'https://profile.mts.ru/account'}));
	var safetyJson = getJson(html);
	if(!safetyJson || !safetyJson.pageProps){
		AnyBalance.trace('Не удалось получить страницу настроек безопасности. Пропускаем проверку способа входа и оповещения о входе');
		return;
	}
	
	if(safetyJson.pageProps.initialState && safetyJson.pageProps.initialState.settings && safetyJson.pageProps.initialState.settings.authuserlevel){
	    var authLevel = safetyJson.pageProps.initialState.settings.authuserlevel;
	    if(authLevel !== '1'){
		    AnyBalance.trace('SMS подтверждение для входа в кабинет включено. Выключаем...');
		    html = AnyBalance.requestPost('https://profile.mts.ru/api', JSON.stringify({
                "call": "updateAuthUserLevel",
                "arg": "1"
            }), addHeaders({'Content-Type': 'application/json', Referer: 'https://profile.mts.ru/account/safety/auth-level'}));
		    
		    var json = getJson(html);
	        AnyBalance.trace(JSON.stringify(json));
            
            if(json.result !== 'success'){
			    AnyBalance.trace('Не удалось отключить SMS подтверждение для входа');
		    }else{
			    AnyBalance.trace('SMS подтверждение для входа успешно отключено');
		    }
	    }else{
		    AnyBalance.trace('SMS подтверждение для входа уже отключено');
	    }
	}else{
		AnyBalance.trace('Не удалось получить настройки способа входа');
	}
	
	if(safetyJson.pageProps.initialState && safetyJson.pageProps.initialState.smsNotification && safetyJson.pageProps.initialState.smsNotification.notifications){
	    var notifyArgs = safetyJson.pageProps.initialState.smsNotification.notifications;
		
	    if(notifyArgs && (notifyArgs.lg_sms !== false)){
		    AnyBalance.trace('SMS уведомление о входе в кабинет включено. Выключаем...');
			notifyArgs.lg = false;
			notifyArgs.lg_sms = false;
		    html = AnyBalance.requestPost('https://profile.mts.ru/api', JSON.stringify({
                "call": "patchSettingNotification",
                "arg": notifyArgs
            }), addHeaders({'Content-Type': 'application/json', Referer: 'https://profile.mts.ru/account/safety/sms-notifications'}));
			
		    AnyBalance.trace(html);
//		    var json = getJson(html);
//	        AnyBalance.trace(JSON.stringify(json));
            
            if(!/successfully/i.test(html)){
			    AnyBalance.trace('Не удалось отключить SMS уведомление о входе');
		    }else{
			    AnyBalance.trace('SMS уведомление о входе успешно отключено');
		    }
	    }else{
		    AnyBalance.trace('SMS уведомление о входе уже отключено');
	    }
	}else{
		AnyBalance.trace('Не удалось получить настройки оповещения о входе');
	}
}
