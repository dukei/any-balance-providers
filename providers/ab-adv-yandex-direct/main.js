/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.6,en;q=0.4',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36'
};

var g_currency = {
	RUB: '₽',
	KZT: '₸',
	BYN: 'Br',
	USD: '$',
	ILS: '₪',
	AMD: '֏',
	GEL: '₾',
	MDL: 'лей',
	AZN: '₼',
	TJS: 'смн.',
	KGS: 'сом',
	CAD: 'C$',
	undefined: ''
};

var baseurl = "https://direct.yandex.ru/";
var g_savedData;

function main(){
    var prefs = AnyBalance.getPreferences();
    
    AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	if(prefs.cid && !/\d+/.test(prefs.cid))
        throw new AnyBalance.Error("Введите ID рекламной кампании, по которой вы хотите получить информацию. Он должен состоять только из цифр!");
	
	if(!g_savedData)
		g_savedData = new SavedData('direct', prefs.login);

	g_savedData.restoreCookies();
	
	var uLogin = g_savedData.get('uLogin');
	
	if(!uLogin){
		if(/@/i.test(prefs.login)){
			uLogin = prefs.login.replace(/(.*)(@.*)$/, '$1');
		}else{
			uLogin = prefs.login;
		}
	}
	
	var html = AnyBalance.requestGet(baseurl + 'wizard/overview/?ulogin=' + uLogin, g_headers);
	
	if (!html || AnyBalance.getLastStatusCode() >= 500) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}
	
	if(!/"currentClient"/i.test(html)){
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
        clearAllCookies();
    	var html = '';
    	html = loginYandex(prefs.login, prefs.password, html, baseurl, 'direct');
			
		html = AnyBalance.requestGet(baseurl, g_headers);
			
        var lastUrl = AnyBalance.getLastUrl();
		
		if(!/ulogin=/i.test(lastUrl)){
			uLogin = AnyBalance.getCookie('yandex_login');
			if(!uLogin && /"loggedin":true/i.test(html)){
    	    	uLogin = getParam(html, null, null, /"login":"([^"]*)/);
    	    }
			html = AnyBalance.requestGet(baseurl + 'wizard/overview/?ulogin=' + uLogin, g_headers);
		}else{
			uLogin = getParam(lastUrl, null, null, /ulogin=([\s\S]*?)$/i, replaceTagsAndSpaces);
		}
		
		if(!/"currentClient"/i.test(html)){
    		AnyBalance.trace(html);
    	    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    	}
			
		g_savedData.set('uLogin', uLogin);
		g_savedData.setCookies();
	    g_savedData.save();
	}else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}
	
    var yandexuid = getParam(html, null, null, /"yandexuid":"([^"]*)/); // id="restoreData">[^<]*\"(\d+)
    var csrf_token = getParam(html, null, null, /"_direct_csrf_token":"([^"]*)/);
	if(!yandexuid)
        throw new AnyBalance.Error('Не удалось найти идентификатор сессии. Сайт изменен?');
	
	var result = {success: true};
	
	var data = getJsonObject(html, /"currentClient":/);
	AnyBalance.trace('data: ' + JSON.stringify(data));
	
	if(AnyBalance.isAvailable(['account', '__tariff'])){
		if(data && data.walletId){
			result.account = data.walletId;
			result.__tariff = data.walletId;
		}
	}
	
    var jsonInfoStr = AnyBalance.requestGet('https://direct.yandex.ru/widget/export?yandexuid=' + yandexuid + '&cid=' + (prefs.cid || ''), g_headers);
	if(/Сервис временно недоступен/.test(jsonInfoStr))
		throw new AnyBalance.Error("Яндекс сообщает: Сервис временно недоступен");
	
	AnyBalance.trace('Обзор: ' + jsonInfoStr);
	var jsonInfo = JSON.parse(jsonInfoStr);
	
	if(jsonInfo.no_campaigns)
        throw new AnyBalance.Error('Рекламные кампании отсутствуют');
	
    if(prefs.cid && (!jsonInfo.camps_info || jsonInfo.camps_info.length == 0))
        throw new AnyBalance.Error('Нет активной рекламной кампании ID:' + prefs.cid);
	
    var sum_rest = jsonInfo.sum_rest;
	var currency_code = jsonInfo.currency_code;
    var active_camps_num = jsonInfo.active_camps_num;
    var active_camps_list = jsonInfo.camps_list || [];
    var camps_info = jsonInfo.camps_info || [];
    var overdraft = jsonInfo.overdraft;
    var has_overdraft = !!jsonInfo.overdraft;
    var overdraft_rest = (overdraft && 1*overdraft.overdraft_rest) || 0;
    var overdraft_debt = (overdraft && 1*overdraft.debt) || 0;
    var overdraft_pay_date = (overdraft && overdraft.pay_date) || '';
	
    result.currency = (g_currency[currency_code]) || currency_code;
	
	if(AnyBalance.isAvailable('balance')){
		if(data && data.balance){
			result.balance = data.balance;
		}else{
            result.balance = sum_rest;
		}
	}
	
	if(AnyBalance.isAvailable('currency_full'))
        result.currency_full = currency_code;
	
    if(has_overdraft){    
        if(AnyBalance.isAvailable('o_rest'))
            result.o_rest = overdraft_rest;
        if(AnyBalance.isAvailable('o_debt'))
            result.o_debt = overdraft_debt;
        if(AnyBalance.isAvailable('o_paydate') && overdraft_pay_date)
            result.o_paydate = parseDate(overdraft_pay_date);
    }
	
    if(AnyBalance.isAvailable('cnum')){
        result.cnum = active_camps_num;
    }
	
    if(AnyBalance.isAvailable('clist')){
        var campsNames = [];
        for(var i=0; i<active_camps_list.length; ++i){
            var camp = active_camps_list[i];
            campsNames[i] = '[' + camp.cid + '] ' + camp.name;
        }
        result.clist = campsNames.join(', \n') || 'Нет кампаний';
    }
	
    var camps_info = jsonInfo.camps_info && jsonInfo.camps_info[0];
    if(camps_info){
        result.__tariff = camps_info.name;
        if(AnyBalance.isAvailable('c_name'))
            result.c_name = camps_info.name;
        if(AnyBalance.isAvailable('cid'))
            result.cid = camps_info.cid;
        if(AnyBalance.isAvailable('c_status'))
            result.c_status = camps_info.status;
        if(AnyBalance.isAvailable('c_rest'))
            result.c_rest = camps_info.sum_rest;
        if(AnyBalance.isAvailable('c_clicks'))
            result.c_clicks = camps_info.clicks_today;
    }
	
	var jsonInfoStr = AnyBalance.requestGet('https://api.passport.yandex.ru/all_accounts', g_headers);
	
	AnyBalance.trace('Профиль: ' + jsonInfoStr);
	var jsonInfo = JSON.parse(jsonInfoStr);
	
	var email = jsonInfo.accounts[0].defaultEmail;
	var login = jsonInfo.accounts[0].login;
	var firstname = jsonInfo.accounts[0].displayName.firstname;
	var lastname = jsonInfo.accounts[0].displayName.lastname;
	var fio = firstname;
	if(lastname)
		fio += ' ' + lastname;
	if(!result.__tariff)
		result.__tariff = fio;
	
	if(AnyBalance.isAvailable('fio'))
	    result.fio = fio;
	
	if(AnyBalance.isAvailable('email'))
	    result.email = email;
	
	if(AnyBalance.isAvailable('login'))
	    result.login = login;
	
    AnyBalance.setResult(result);
}