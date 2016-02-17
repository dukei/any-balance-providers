/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');

    var baseurl = "https://www.reg.ru";
	
    var html = AnyBalance.requestPost(baseurl + '/user/login?nocache=8834', {
        login: prefs.login,
        password: prefs.password,
        mode: 'login'
    }, addHeaders({
        Origin: baseurl,
        Referer: baseurl,
        'X-Requested-With':'XMLHttpRequest'
    }));

    var json = getJsonEval(html);

    if (json.success != 1) {
        var error = json.errors && json.errors[0] && html_entity_decode(json.errors[0].text);
        if (error) {
            throw new AnyBalance.Error(error, null, !!json.auth_error);
        }

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка авторизации');
    }

    html = AnyBalance.requestGet(baseurl + '/user/welcomepage', g_headers);

    var result = {success: true};
    
    var userData = getElements(html, /<div[^>]*?class="b-header__user-link"/ig, replaceTagsAndSpaces);
	
    getParam(userData[0], result, 'balance', null, null, parseBalance);
    getParam(userData[1], result, 'user');
    
    function valueRX(title) {
        return RegExp(title.replace(/\s+/g, '(?:\\s|&nbsp;)+') + '[^<]*:?\\s*<[^>]*>\\s*<[^>]*>([^<]+)', 'i');
    }
    
    getParam(html, result, 'limit', valueRX('Доступный вам кредитный лимит'), replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'code', valueRX('Персональный код оплаты'), replaceTagsAndSpaces);
    
    var actDomCount = AB.getParam(html, null, null, /Количество\s+активных\s+доменов<\/td\s*>\s*<td[^>]*>\s*<b>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
    var actSerCount = AB.getParam(html, null, null, /Количество\s+активных\s+хостинг-услуг<\/td\s*>\s*<td[^>]*>\s*<b>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
    
    if (AnyBalance.isAvailable('plan')) {
        html = AnyBalance.requestGet(baseurl + '/user/balance/get_next_month_expenses', AB.addHeaders({'X-Requested-With':'XMLHttpRequest'}));
        json = getJsonEval(html);
        if (json.ok == 0) {
            html = AnyBalance.requestGet(baseurl + '/user/balance/get_next_month_expenses', AB.addHeaders({'X-Requested-With':'XMLHttpRequest'}));
            json = getJsonEval(html);
        }
        if (json.ok == 1) {
            getParam(json.expenses, result, 'plan', null, null, parseBalance);
        }
    }

    srvList('domain', actDomCount, 3, result, baseurl);
    srvList('service', actSerCount, 3, result, baseurl);

    AnyBalance.setResult(result);
}

function srvList(type, count, maxCount, result, baseurl) {
    if (!count) { return; }
    var i, arr = [];
    for (i = 0; i < maxCount; ++i) {
        arr.push(type + '_' + i, type + '_date_' + i);
    }
    if (!AnyBalance.isAvailable(arr)) { return; }
    
    var urls = {
        domain: '/user/domain_list?filters_selected_servtype=domain&filters_status=active',
        service: '/user/service_list?filters_status=active'
    };
    
    var html = AnyBalance.requestGet(baseurl + urls[type], g_headers);
    var parent = AB.getElement(html, /<table[^>]*?user-services-list/i);
    if (!parent) { return; }
    var rows = AB.getElements(parent, /<tr[^>]*?valign="middle"/ig);

    for(var i = 0; i < rows.length; i++) {
        getParam(rows[i], result, type + '_'+ i, /<a[^>]*?services-list__item[^>]*>([^<]+)/i, replaceTagsAndSpaces);
        getParam(rows[i], result, type + '_date_'+i, /--\s*окончание\s*--[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseDate);
        if(i >= maxCount) { break; }
    }
}
