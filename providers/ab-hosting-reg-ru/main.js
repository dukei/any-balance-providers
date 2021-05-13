/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	//'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');

    
    var token=AnyBalance.getData(prefs.login+'token');
    if (token){
    	AnyBalance.trace('Найден старый токен. Проверяем');
    	g_headers['content-type']='application/json';
    	g_headers['x-acc-csrftoken']=token;
    	AnyBalance.restoreCookies();
    	AnyBalance.trace(JSON.stringify(AnyBalance.getCookies()));
    	try{
    		var html=AnyBalance.requestPost('https://login.reg.ru/refresh',null,g_headers);
	    	var json=getJson(html);
	    	if (json.result.status!='session_refreshed') token='';
    	}catch(e){
                AnyBalance.trace('Ошибка востановления токена\n'+e.message)
                token='';
    	}
    }
    if (!token){
    	AnyBalance.trace('Нужно логиниться');
    	clearAllCookies();
    	g_headers['x-acc-csrftoken']='';
    	g_headers['content-type']='application/x-www-form-urlencoded';
    	loginSite(prefs);
    }

    html = AnyBalance.requestPost('https://gql-acc.svc.reg.ru/v1',JSON.stringify({
	"operationName": "user",
	"variables": {},
	"query": "query user {\n  user {\n    balance\n    contractNumber\n    contractDate\n    ownerType\n    phone\n    pricegroup\n    plan\n    planDate\n    phone\n    email\n    isBaseContactsFilled\n    isOrg\n    isEntrepreneur\n    firstName\n    lastName\n    company\n    initials\n    isHaveCc\n        notPaidBills {\n      count\n      amount\n    }\n    is_rdh\n    isTest\n    referral_promocode\n    is_budget\n    domainsTurnover\n    currencyRate\n    isMonitorEnabled\n    monitorNextDate\n    host\n    isConnectedEdo: electronic_doc_management\n    isResident: is_resident\n    referralAttentionCount: referral_notices_count\n  }\n}\n"
	}),g_headers);

    var result = {success: true};
    
    var userData = getJson(html).data;
	
    getParam(userData.user.balance, result, 'balance', null, null, parseBalance);
    getParam(userData.user.currencyRate, result, 'currencyRate', null, null, parseBalance);
    getParam(userData.user.plan, result, '__tariff');
    getParam(userData.user.contractNumber+' от '+userData.user.contractDate, result, 'dogovor');
    getParam(userData.user.referral_promocode, result, 'code');
    getParam(userData.user.company||userData.user.lastName+' '+userData.user.firstName, result, 'user');
    getParam(userData.user.notPaidBills.amount, result, 'notPaidBills', null, null, parseBalance);
    if (userData.user.notPaidBills && userData.user.notPaidBills.count)
    	result.notPaidBillsCount=' ('+userData.user.notPaidBills.count+' шт.)';

    html = AnyBalance.requestPost('https://gql-acc.svc.reg.ru/v1',JSON.stringify({
	"operationName": "services",
	"variables": {
		"first": 0,
		"offset": 10,
		"filterType": "",
		"filterValue": "",
		"sort": "created",
		"sortOrder": "desc",
		"searchQuery": ""
	},
	"query": "query services($first: Int!, $offset: Int!, $folderId: Int, $filterType: String, $filterValue: String, $searchQuery: String, $sort: String, $sortOrder: String) {\n  services(\n    first: $first\n    offset: $offset\n    folderId: $folderId\n    filterType: $filterType\n    filterValue: $filterValue\n    searchQuery: $searchQuery\n    sort: $sort\n    sortOrder: $sortOrder\n  ) {\n    items {\n      ...BaseServicesItem\n      __typename\n    }\n     }\n}\n\nfragment BaseServicesItem on Service {\n  state\n  expiration_date\n  service_title\n   comment\n  }\n"
	}),g_headers);
    var services = getJson(html).data.services.items;
    	for (var i=0;i<services.length;i++){
    		getParam(services[i].service_title, result, 'service_'+i);
    		if (services[i].state!='A') result['service_'+i]='!!! '+result['service_'+i];
    		getParam(services[i].expiration_date, result, 'service_date_'+i, null, null, parseDate);
    	}

    if (AnyBalance.isAvailable('plan')) {
    	var baseurl = "https://www.reg.ru";
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
    
    AnyBalance.setResult(result);
}


function loginSite(prefs){
    var baseurl = "https://www.reg.ru";
    var html = AnyBalance.requestGet(baseurl + '/user/authorize', g_headers);

    var csrf = getParam(html, /<meta[^>]+name="_csrf"[^>]*content="([^"]*)/i, replaceHtmlEntities);
    if(!csrf){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удаётся найти форму входа. Сайт изменен?');
    }
	
    html = AnyBalance.requestPost(baseurl + '/user/login', {
        login: prefs.login,
        password: prefs.password,
        mode: 'login'
    }, addHeaders({
        Origin: baseurl,
        Referer: AnyBalance.getLastUrl(),
        'X-Requested-With':'XMLHttpRequest',
        'X-Csrf-Token': csrf
    }));

    var json = getJsonEval(html);

    if (json.success != 1) {
    	if (json.need_captcha==1){
    	    //csrf=json.csrf;
    	    var recaptcha = solveRecaptcha("Пожалуйста, докажите, что Вы не робот", AnyBalance.getLastUrl(), '6LfU9QUTAAAAABOtrrApNyPn3_64iMNBJSodhE0F');
    	    html = AnyBalance.requestPost(baseurl + '/user/login', {
	        login: prefs.login,
	        password: prefs.password,
                'g-recaptcha-response':recaptcha,
	        mode: 'login'
	    }, addHeaders({
	        Origin: baseurl,
	        Referer: AnyBalance.getLastUrl(),
	        'X-Requested-With':'XMLHttpRequest',
	        'X-Csrf-Token': csrf
	    }));
	    var json = getJsonEval(html);
    	}
    	if (json.success != 1) {
        	var error = json.errors && json.errors[0] && html_entity_decode(json.errors[0].text);
        	if (error) {
        		throw new AnyBalance.Error(error, null, !!json.auth_error);
        	}

        	AnyBalance.trace(html);
        	throw new AnyBalance.Error('Ошибка авторизации');
        }
    }

    //html = AnyBalance.requestGet(baseurl + '/user/welcomepage', g_headers);
    html = AnyBalance.requestPost('https://login.reg.ru/propagate_legacy_session',null,g_headers);


    html = AnyBalance.requestGet('https://gql-acc.svc.reg.ru/account/issue_csrf_token',g_headers);
    g_headers['content-type']='application/json';
    g_headers['x-acc-csrftoken']=AnyBalance.getCookie('acc-csrftoken');
    AnyBalance.setData(prefs.login+'token',g_headers['x-acc-csrftoken']);
    AnyBalance.saveCookies();
    AnyBalance.saveData();
}