/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36'
};

var baseurl = 'https://www.reg.ru';

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');	
	
    AnyBalance.setDefaultCharset('utf-8');
    
    var csrfToken = AnyBalance.getData(prefs.login + 'csrfToken');
	var accToken = AnyBalance.getData(prefs.login + 'accToken');
    if(csrfToken){
    	AnyBalance.trace('Токен авторизации сохранен. Пробуем обновить...');
    	g_headers['content-type'] = 'application/json';
    	g_headers['x-csrf-token'] = csrfToken;
    	AnyBalance.restoreCookies();
    	try{
    		var html = AnyBalance.requestPost('https://login.reg.ru/refresh', null, addHeaders({
				'Accept': 'application/json, text/plain, */*',
	            'Origin': 'https://www.reg.ru',
	            'Referer': 'https://www.reg.ru/'
	        }));
			if(AnyBalance.getLastStatusCode() >= 500){
                AnyBalance.trace(html);
                throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
            }
	    	var json = getJson(html);
			AnyBalance.trace(JSON.stringify(json));
	    	if(json.result.status != 'session_refreshed'){
				AnyBalance.trace('Не удалось обновить токен авторизации')
				csrfToken = '';
				accToken = '';
			}else{
				AnyBalance.trace('Токен авторизации успешно обновлен')
				html = AnyBalance.requestGet('https://gql-acc.svc.reg.ru/account/issue_csrf_token', g_headers);
	            AnyBalance.trace(JSON.stringify(AnyBalance.getCookies()));
				g_headers['x-csrf-token'] = AnyBalance.getCookie('csrftoken');
	            g_headers['x-acc-csrftoken'] = AnyBalance.getCookie('acc-csrftoken');
                AnyBalance.setData(prefs.login + 'csrfToken', g_headers['x-csrf-token']);
	            AnyBalance.setData(prefs.login + 'accToken', g_headers['x-acc-csrftoken']);
				AnyBalance.saveCookies();
                AnyBalance.saveData();
				csrfToken = AnyBalance.getData(prefs.login + 'csrfToken');
	            accToken = AnyBalance.getData(prefs.login + 'accToken');
			}
    	}catch(e){
                AnyBalance.trace('Ошибка обновления токена: ' + e.message)
                csrfToken = '';
				accToken = '';
    	}
    }
    if(!csrfToken || !accToken){
    	AnyBalance.trace('Сессия новая. Будем логиниться заново...');
    	clearAllCookies();
    	g_headers['content-type'] = 'application/x-www-form-urlencoded';
    	loginSite(prefs);
    }

    var result = {success: true};
	
	if(AnyBalance.isAvailable('balance', 'currency_rate', '__tariff', 'contract', 'contract_date', 'code', 'user', 'company', 'not_paid_bills_amount', 'not_paid_bills_count', 'next_pay_date')){
	    html = AnyBalance.requestPost('https://gql-acc.svc.reg.ru/v1', JSON.stringify({
            "operationName": "user",
            "variables": {},
            "query": "query user {\n  user {\n    login\n    balance\n    contractNumber\n    contractDate\n    resellerContractNumber\n    resellerContractDate\n    regDate\n    lastLogin\n    ownerType\n    phone\n    pricegroup\n    plan\n    planDate\n    phone\n    isPhoneConfirmed\n    userAgent\n    lastLoginTime\n    lastIP\n    currentIP\n    email\n    isEmailConfirmed\n    isEmailRejected\n    isBaseContactsFilled\n    isOrg\n    isEntrepreneur\n    firstName\n    lastName\n    company\n    initials\n    settings_require_attention_count\n    isHaveBankCard: isHaveCc\n    docs_for_paperless_operations {\n      doc_id\n      activation_date\n      receive_date\n      start_date\n      end_date\n      external_doc_id\n      __typename\n    }\n    notPaidBills {\n      count\n      amount\n      __typename\n    }\n    security {\n      restrict_login_ip {\n        id\n        range\n        __typename\n      }\n      ip_filter_reset_enabled\n      bind_session_to_ip\n      __typename\n    }\n    agreements {\n      type_title\n      title\n      number\n      date\n      link\n      is_downloadable\n      __typename\n    }\n    is_rdh\n    isTest\n    referral_promocode\n    is_budget\n    domainsTurnover\n    currencyRate\n    isMonitorEnabled\n    monitorNextDate\n    host\n    isConnectedEdo: electronic_doc_management\n    isResident: is_resident\n    referralAttentionCount: referral_notices_count\n    __typename\n  }\n}\n"
        }), g_headers);
        
        var userData = getJson(html).data;
		getParam(userData.user.balance, result, 'balance', null, null, parseBalance);
		
        getParam((userData.user.currencyRate).toFixed(2), result, 'currency_rate', null, null, parseBalance);
        getParam(userData.user.plan, result, '__tariff');
        getParam(userData.user.contractNumber, result, 'contract');
	    getParam(userData.user.contractDate, result, 'contract_date', null, null, parseDate);
        getParam(userData.user.referral_promocode, result, 'code');
		getParam(userData.user.phone.replace(/.*(\d{3})(\d{3})(\d{2})(\d{2})$/i, '+7 $1 $2-$3-$4'), result, 'phone');
        getParam(userData.user.firstName + ' ' + userData.user.lastName, result, 'user');
	    getParam(userData.user.company, result, 'company');
        getParam(userData.user.notPaidBills.amount, result, 'not_paid_bills_amount', null, null, parseBalance);
	    getParam(userData.user.notPaidBills.count, result, 'not_paid_bills_count', null, null, parseBalance);
		getParam(userData.user.monitorNextDate, result, 'next_pay_date', null, null, parseDate);	
	}	
	
	if(AnyBalance.isAvailable('debet', 'credit', 'credit_days')){
	    html = AnyBalance.requestPost('https://gql-acc.svc.reg.ru/v1', JSON.stringify({
            "operationName": "userBalanceInit",
            "variables": {},
            "query": "query userBalanceInit {\n  userBalanceInit {\n    account_turnover\n    blocked_sum\n    blocked_sum_rub\n    creditlimit\n    creditlimit_rub\n    days_left_for_credit\n    has_autorefill\n    bindings {\n      binding_id\n      user_id\n      state\n      currency\n      enable_autorefill\n      enable_autorenew\n      expiration\n      insert_time\n      notified_about_fail\n      pay_type\n      priority\n      settings {\n        name_id\n        limit\n        is_card\n        __typename\n      }\n      __typename\n    }\n    binding_methods {\n      yamoney {\n        binding_url\n        client_id\n        text\n        redirect_uri\n        response_type\n        scope\n        __typename\n      }\n      __typename\n    }\n    pre_sum\n    pre_sum_rub\n    unpaid_bills_sum\n    user_credit\n    user_is_private_person\n    autorefill_settings {\n      amount\n      threshold\n      default_amount\n      default_threshold\n      max_amount\n      __typename\n    }\n    allowedBindingTypes\n    __typename\n  }\n}\n"
        }), g_headers);
	    
	    var balanceInit = getJson(html).data.userBalanceInit;
	    getParam(balanceInit.account_turnover, result, 'debet', null, null, parseBalance);
        getParam(balanceInit.creditlimit_rub, result, 'credit', null, null, parseBalance);
	    getParam(balanceInit.days_left_for_credit, result, 'credit_days', null, null, parseBalance);
	}	
	
	if(AnyBalance.isAvailable('messages')){
	    html = AnyBalance.requestPost('https://gql-acc.svc.reg.ru/v1', JSON.stringify({
            "operationName": "getUnreadMessagesCount",
            "variables": {},
            "query": "query getUnreadMessagesCount {\n  unreadMessagesCount: getUnreadMessagesCount\n}\n"
        }), g_headers);
	    
	    var messages = getJson(html).data;
        getParam(messages.unreadMessagesCount, result, 'messages', null, null, parseBalance);
	}	

    if(AnyBalance.isAvailable('domain', 'domain_date', 'domain_days', 'domain2', 'domain2_date', 'domain2_days', 'domain3', 'domain3_date', 'domain3_days', 'domain4', 'domain4_date', 'domain4_days', 'domain5', 'domain5_date', 'domain5_days', 'service', 'service_date', 'service_days', 'service2', 'service2_date', 'service2_days', 'service3', 'service3_date', 'service3_days', 'service4', 'service4_date', 'service4_days', 'service5', 'service5_date', 'service5_days', 'service6', 'service6_date', 'service6_days', 'service7', 'service7_date', 'service7_days', 'service8', 'service8_date', 'service8_days', 'service9', 'service9_date', 'service9_days', 'service10', 'service10_date', 'service10_days')){
        html = AnyBalance.requestPost('https://gql-acc.svc.reg.ru/v1', JSON.stringify({
            "operationName": "services",
            "variables": {
                "sort": "created",
                "sortOrder": "desc",
                "offset": 0,
                "limit": 25,
                "filter": []
            },
            "query": "query services($offset: Int!, $limit: Int!, $folderId: Int, $filter: [FilterInputItem], $sort: String, $sortOrder: String) {\n  services(\n    offset: $offset\n    limit: $limit\n    folderId: $folderId\n    filter: $filter\n    sort: $sort\n    sortOrder: $sortOrder\n  ) {\n    hasMore\n    totalCount\n    items {\n      ...BaseServicesItem\n      upgradeFromServiceId: upgrade_from_service_id\n      ...ServiceAdditionalStates\n      ...ServiceAdditionalInfo\n      ...ServiceAutorenew\n      ...ServiceLoginPartcontrol\n      ...SslCertificate\n      ...PanelLoginHash\n      ...Hosting\n      ...LinkedDomains\n      ...Nss\n      ...OtherFields\n      ...BackupItem\n      ...Domain\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment BaseServicesItem on Service {\n  dname\n  service_id\n  user_id\n  servtype\n  subtype\n  servgroup\n  state\n  expiration_date\n  creation_date\n  service_title\n  is_dateless\n  is_configured\n  comment\n  folders_count\n  accountState: account_state\n  stateMessage: state_message\n  owner {\n    name\n    email\n    __typename\n  }\n  lot {\n    id: lot_id\n    __typename\n  }\n  recommendedServices: recommended_services {\n    servtype\n    serviceId: service_id\n    isEnable: is_enable\n    isActive: is_active\n    ... on PrivatePersonRecommendedService {\n      isAlwaysHidden: is_always_hidden\n      isInTariff: is_in_tariff\n      __typename\n    }\n    ... on AntiddosRecommendedService {\n      plan\n      __typename\n    }\n    __typename\n  }\n  ...ServiceAutorenew\n  __typename\n}\n\nfragment ServiceAutorenew on Service {\n  autorenew {\n    enabled\n    have_partcontrol\n    is_in_partcontrol_for_auth_user\n    on\n    next_autorenew_date\n    __typename\n  }\n  __typename\n}\n\nfragment ServiceAdditionalStates on Service {\n  additionalStates: additional_states {\n    is_active\n    is_changing_account\n    is_email_not_verified\n    is_docs_not_verified\n    is_in_partcontrol\n    is_send_to_partcontrol\n    renewal_status\n    issueStatus: issue_status\n    renewal_warning_status\n    is_trusted_prolong\n    isSiteConfigured: is_site_configured\n    transfer {\n      status\n      date\n      email\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment ServiceAdditionalInfo on Service {\n  additionalInfo: additional_info {\n    blocked_reason\n    renew_grace_period_before_expdate\n    renew_trusted_prolong_bill {\n      bill_amount\n      bill_date\n      bill_sid\n      bill_id\n      bill_overdue_date\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment ServiceLoginPartcontrol on Service {\n  loginPartcontrol: login_partcontrol {\n    whom\n    who\n    __typename\n  }\n  __typename\n}\n\nfragment SslCertificate on Service {\n  ssl_certificate {\n    is_can_renew\n    __typename\n  }\n  __typename\n}\n\nfragment PanelLoginHash on Service {\n  panel_login_hash {\n    uri\n    params\n    __typename\n  }\n  __typename\n}\n\nfragment Hosting on Service {\n  hosting {\n    login\n    __typename\n  }\n  __typename\n}\n\nfragment LinkedDomains on Service {\n  linked_domains {\n    service_id\n    service_title\n    __typename\n  }\n  __typename\n}\n\nfragment Nss on Service {\n  nss {\n    ns\n    __typename\n  }\n  __typename\n}\n\nfragment OtherFields on Service {\n  rswordpress {\n    login\n    access_info {\n      cmses {\n        uri: url\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  rsjoomla {\n    login\n    access_info {\n      cmses {\n        uri: url\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  seowizard {\n    balance\n    __typename\n  }\n  jelastic {\n    balance\n    __typename\n  }\n  __typename\n}\n\nfragment BackupItem on Service {\n  backup_item {\n    link\n    last_date\n    __typename\n  }\n  __typename\n}\n\nfragment Domain on Service {\n  domain {\n    isRusurfDomain: is_rusurf_domain\n    __typename\n  }\n  __typename\n}\n"
        }), g_headers);
	    
        var services = getJson(html).data.services.items;
    	var serviceCounterNumber = 0;
    	var domainCounterNumber = 0;
    	for(var i=0; i<services.length; i++){
    		if(services[i].servtype == 'domain' && domainCounterNumber <= 5){
				var countername = (domainCounterNumber >= 1 ? 'domain' + (domainCounterNumber + 1) : 'domain');
				var tracename = 'домена';
    			domainCounterNumber += 1;
    		}else{
				var countername = (serviceCounterNumber >= 1 ? 'service' + (serviceCounterNumber + 1) : 'service');
				var tracename = 'услуги';
                serviceCounterNumber += 1;
    		}
    		var title = getParam(services[i].service_title, result, countername);
    		var date = getParam(services[i].expiration_date, null, null, null, null, parseDate);
			if(date){
			    result[countername + '_date'] = date;
				if (AnyBalance.isAvailable('domain_days', 'domain2_days', 'domain3_days', 'domain4_days', 'domain5_days', 'service_days', 'service2_days', 'service3_days', 'service4_days', 'service5_days', 'service6_days', 'service7_days', 'service8_days', 'service9_days', 'service10_days')) {
			        var days = Math.ceil((date - (new Date().getTime())) / 86400 / 1000);
			        if(days >= 0){
			            result[countername + '_days'] = days;
			        }else{
			            AnyBalance.trace('Дата окончания ' + tracename + ' ' + title + ' уже наступила');
			        	result[countername + '_days'] = 0;
			        }
				}	
		    }else{
 		    	AnyBalance.trace('Не удалось получить дату окончания ' + tracename + ' ' + title);
 		    }
    	}
	}
	
	if(AnyBalance.isAvailable('expenses')){
		delete g_headers['x-csrf-token'];
		delete g_headers['x-acc-csrftoken'];
		var tries = 0;
		do{
	    	html = AnyBalance.requestGet('https://b2b.reg.ru/user/balance/get_next_month_expenses', g_headers);
		}while (!/"ok":1/i.test(html) && ++tries < 5);
		result.expenses = null;
		if(/"ok":/i.test(html)){
			AnyBalance.trace (html);
			json = getJson(html);
            if(json.expenses)
                getParam(json.expenses, result, 'expenses', null, null, parseBalance);
		}else{
 		    AnyBalance.trace('Не удалось получить данные о планируемых расходах');
 		}	
    }
	
	AnyBalance.setResult(result);
}

function loginSite(prefs){
    var html = AnyBalance.requestGet(baseurl + '/user/authorize', g_headers);// Устанавливаем куку SESSION_ID
	
	if(AnyBalance.getLastStatusCode() >= 500){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
	html = AnyBalance.requestGet('https://login.reg.ru/authenticate', g_headers); // Надо, чтобы кука csrftoken установилась
	
	g_headers['x-csrf-token'] = AnyBalance.getCookie('csrftoken');
	
    html = AnyBalance.requestPost('https://login.reg.ru/authenticate', JSON.stringify({
        'login': prefs.login,
        'password': prefs.password
    }), addHeaders({
        'Origin': baseurl,
        'Referer': baseurl + '/'
    }));

    var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));

    if(json.result && json.result.status && json.result.status === 'need_captcha'){
		AnyBalance.trace('REG.RU затребовал капчу');
        var siteKey = json.result.site_key;
		var recaptcha = solveRecaptcha('Пожалуйста, подтвердите, что вы не робот', AnyBalance.getLastUrl(), siteKey, {USERAGENT: g_headers['User-Agent']});
        html = AnyBalance.requestPost('https://login.reg.ru/authenticate', JSON.stringify({
	        'login': prefs.login,
	        'password': prefs.password,
            'captcha_response': recaptcha
	    }), addHeaders({
	        'Origin': baseurl,
	        'Referer': baseurl + '/'
	    }));
	    var json = getJson(html);
	    AnyBalance.trace(JSON.stringify(json));
		
		if(json.result && json.result.status && json.result.status === 'need_captcha'){
    	    AnyBalance.trace(html);
    	    throw new AnyBalance.Error('Не удалось выполнить проверку ReCaptcha. Попробуйте еще раз позже');
        }
    }
	
	if(json.success !== true){
    	var error = json.message && json.message[0] && html_entity_decode(json.message[0].text);
    	if(error){
			if(/технически|technical/i.test(error)){
				AnyBalance.trace(html);
	            throw new AnyBalance.Error('На сайте ведутся технические работы. Попробуйте еще раз позже');
	        }else{
				AnyBalance.trace(html);
    		    throw new AnyBalance.Error(error, null, !!json.auth_error);
			}	
    	}

    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }

//  html = AnyBalance.requestGet(baseurl + '/user/welcomepage', g_headers);
    html = AnyBalance.requestPost('https://login.reg.ru/propagate_legacy_session', null, g_headers);

    html = AnyBalance.requestGet('https://gql-acc.svc.reg.ru/account/issue_csrf_token', g_headers);
	AnyBalance.trace(JSON.stringify(AnyBalance.getCookies()));
    g_headers['content-type'] = 'application/json';
    g_headers['x-csrf-token'] = AnyBalance.getCookie('csrftoken');
	g_headers['x-acc-csrftoken'] = AnyBalance.getCookie('acc-csrftoken');
    AnyBalance.setData(prefs.login + 'csrfToken', g_headers['x-csrf-token']);
	AnyBalance.setData(prefs.login + 'accToken', g_headers['x-acc-csrftoken']);
    AnyBalance.saveCookies();
    AnyBalance.saveData();
}