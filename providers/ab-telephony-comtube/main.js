 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_currency = {'руб': '₽', RUB: '₽', USD: '$', EUR: '€', GBP: '£', BYN: 'Br', KZT: '₸', CNY: 'Ұ', UAH: '₴', CHF: '₣', JPY: '¥', CHF: '₣', CZK: 'Kč', PLN: 'zł', undefined: ''};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');    

    var baseurl = 'https://www.comtube.com/';
    
    var info = AnyBalance.requestPost(baseurl + "index/auth_form?from=main_page_reg", {
        from:'main_page_reg',
        action:'auth',
        txtUserName:prefs.login,
        txtUserPass:prefs.password
    });

    if(!/log_out=1/.test(info)){
        var error = getParam(info, null, null, /"ajaxAuthFormErr"[^>]*>([\s\S]*?)<\//i, [/<.*?>/g, '', /^\s*|\s*$/g, '']);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удаётся войти в личный кабинет. Сайт изменен?');
    }
	
	var result = {success: true};
	
    getParam(info, result, 'balance', /curr_balance":([\d\s".,\-]+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(info, result, ['currency', 'balance'], /currency":"([^"]+)/i, replaceTagsAndSpaces, parseCurrencyMy);
    getParam(info, result, 'number', /(?:Ваш номер внутри|You number in) Comtube:[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);
	getParam(info, result, '__tariff', /(?:Ваш номер внутри|You number in) Comtube:[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);

    if(AnyBalance.isAvailable('invest')){
        info = AnyBalance.requestGet(baseurl + 'index/payment_invest_info');
        getParam(info, result, 'invest', /Баланс инвестиционного счета:[\s\S]*?<span[^>]+class="p-big"[^>]*>([\s\S]*?)<\/span>/i, [/,/g, '', replaceTagsAndSpaces], parseBalance);
    }

    if(AnyBalance.isAvailable('partner_balance', 'partner_available')){
        info = AnyBalance.requestGet(baseurl + 'index/partnership_main_stat');
        getParam(info, result, 'partner_balance', /Партнерский счет:([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces, parseBalance);
        getParam(info, result, 'partner_available', /Доступно для вывода:([\s\S]*?)(?:<\/font>|<br)/i, replaceTagsAndSpaces, parseBalance);
    }

    if(AnyBalance.isAvailable('licschet')){
        info = AnyBalance.requestGet(baseurl + 'index/home_page_settings');
        getParam(info, result, 'licschet', /Номер моего лицевого счета([\s\S]*?)(?:<\/dd>|<a)/i, replaceTagsAndSpaces);
    }
	
	AnyBalance.setResult(result);
}

function parseCurrencyMy(text){
    var val = text.replace(/\s+/g, '').replace(/[\-\d\.,]+/g, '');
    val = g_currency[val] || val;
    AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
    return val;
}
