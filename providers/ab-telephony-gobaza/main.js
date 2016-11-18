
var g_headers = {
    'Accept':           'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Charset':   'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':  'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'User-Agent':       'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');    

    var baseurl = "https://lk.gobaza.ru/",
        html    = AnyBalance.requestGet(baseurl, g_headers);

    if (!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
    }

    var URL = AnyBalance.getLastUrl(),
        idt = AB.getParam(html, null, null, /<input[^>]+IDENTIFICATION[^>]+value="([^"]*)/i),
        fnm = AB.getParam(html, null, null, /<input[^>]+FORMNAME[^>]+value="([^"]*)/i);

    if(!idt || !fnm) {
        throw new AnyBalance.Error("Не удалось найти параметры для авторизации. Сайт изменён?");
    }

    html = AnyBalance.requestPost(URL, {
        IDENTIFICATION: idt,
        USERNAME:       prefs.login,
        PASSWORD:       prefs.password,
        FORMNAME:       fnm
    }, g_headers);


    if(!/replace/i.test(html)){
        var error = getParam(html, null, null, /alert\s*\(\s*["']([^"']*)/i, AB.replaceTagsAndSpaces);
        if(error) {
            throw new AnyBalance.Error(error, null, /имя|парол/i.test(error));

        }

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var menu_url = AB.getParam(html, null, null, /<frame[^>]+name="menu"[^>]+src="([^"]*)/i),
        data_url = AB.getParam(html, null, null, /<frame[^>]+name="data"[^>]+src="([^"]*)/i);
    
    var result = {success: true};

    html = AnyBalance.requestGet(baseurl + 'owa/gbaza/!w3_p_main.showform' + data_url, g_headers);

    AB.getParam(html, result, 'balance',     /<td[^>]*>Текущий баланс[^>]*>([^<]*)/i,           AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'st_balance',  /<td[^>]*>Баланс на начало[^>]*>([^<]*)/i,         AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'sum_bills',   /<td[^>]*>Сумма счетов[^>]*>([^<]*)/i,             AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'sum_current', /<td[^>]*>Сумма текущих начислений[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'sum_paid',    /<td[^>]*>Сумма платежей[^>]*>([^<]*)/i,           AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'rec_sum',     /<td[^>]*>Рекомендуемая сумма[^>]*>([^<]*)/i,      AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'to_limit',    /<td[^>]*>Порог отключения[^>]*>([^<]*)/i,         AB.replaceTagsAndSpaces, AB.parseBalance);

    AB.getParam(html, result, 'date_start', /Дата подключения[^>]*>([^<]*)/i,                            AB.replaceTagsAndSpaces, AB.parseDate);
    AB.getParam(html, result, 'next_date',  /Начало следующего расчётного периода(?:[^>]*>){2}([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseDate);
    AB.getParam(html, result, 'address',    /Адрес(?:[^>]*>){2}([^<]*)[^>]*>([^<]*)/i,                   AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'fio',        /Клиент(?:[^>]*>){2}([^<]*)/i,                               AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'account',     /Лицевой счёт(?:[^>]*>){2}([^<]*)/i,                        AB.replaceTagsAndSpaces);

    if(isAvailable(['mins_month', 'mins_left', 'mins_total', 'mins_used'])) {
        html = AnyBalance.requestGet(baseurl + 'owa/gbaza/!w3_p_main.showform' + menu_url);

        var mins_url = AB.getParam(html, null, null, /<a[^>]+click(?:[^']*'){3}([^']*)[^>]*>Остаток минут/i);
        if(!mins_url) {
            AnyBalance.trace("Не удалось найти ссылку на страницу с остатками минут");
        }

        html = AnyBalance.requestGet(baseurl + 'owa/gbaza/!w3_p_main.showform' + mins_url);
        AB.getParam(html, result, 'mins_total', /Количество включённых минут по тарифу(?:[\s\S]*?<td[^>]*>){2}([^<]*)/i,        AB.replaceTagsAndSpaces, AB.parseBalance);
        AB.getParam(html, result, 'mins_month',  /Количество включённых минут в текущем месяце(?:[\s\S]*?<td[^>]*>){3}([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
        AB.getParam(html, result, 'mins_used',   /Израсходованное количество минут(?:[\s\S]*?<td[^>]*>){4}([^<]*)/i,             AB.replaceTagsAndSpaces, AB.parseBalance);
        AB.getParam(html, result, 'mins_left',   /Остаток минут до конца месяца(?:[\s\S]*?<td[^>]*>){5}([^<]*)/i,                AB.replaceTagsAndSpaces, AB.parseBalance);
    }

    AnyBalance.setResult(result);
}
