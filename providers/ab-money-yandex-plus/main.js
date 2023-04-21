/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Encoding': 'gzip, deflate, br',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36'
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

var g_type = {
	'plus': 'Плюс',
	'plus-more.tv': 'Плюс с more.tv',
	'plus-multi': 'Плюс Мульти',
	'plus-multi-more.tv': 'Плюс Мульти с more.tv',
	'plus-multi-amediateka': 'Плюс Мульти с Амедиатекой'
};

var g_status = {
	ACTIVE: 'Активна',
	STOPPED: 'Приостановлена'
};

var g_role = {
	MASTER: 'Администратор',
	CHILD: 'Участник',
	null: 'Владелец'
};

var baseurl = 'https://plus.yandex.ru/';
var baseurlApi = 'https://api.plus.yandex.ru/';
var g_savedData;

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('UTF-8');
	
	checkEmpty(prefs.login, 'Введите логин для входа в систему Яндекс!');
	checkEmpty(prefs.password, 'Введите пароль для входа в систему Яндекс!');
	
	if(!g_savedData)
		g_savedData = new SavedData('plus', prefs.login);

	g_savedData.restoreCookies();

	var html = AnyBalance.requestGet(baseurl, g_headers);
	var data = getJsonObject(html, /window.__PRELOADED_STATE__\s*=\s*/);

	if(data && data.header && data.header.defaultAccount && data.header.defaultAccount.uid){
		AnyBalance.trace('Похоже, мы уже залогинены на имя ' + data.header.defaultAccount.name + ' (' + prefs.login + ')');
	}else{
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
        clearAllCookies();
		var html = '';
		html = loginYandex(prefs.login, prefs.password, html, baseurl, 'plus');
			
        html = AnyBalance.requestGet(baseurl, g_headers);
		
		if(!/"isAuthorized":true/i.test(html)){
    		AnyBalance.trace(html);
    	    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    	}
			
		var data = getJsonObject(html, /window.__PRELOADED_STATE__\s*=\s*/);

		g_savedData.setCookies();
	    g_savedData.save();
	}
	
    var result = {success: true};
	
    var ip = data.static.data.ip; // Нужно для get
	AnyBalance.trace('ip: ' + ip);
	var requestId = data.static.data.requestId; // Нужно для get
	AnyBalance.trace('requestId: ' + requestId);
	var uid = data.header.defaultAccount.uid; // Нужно для get
	AnyBalance.trace('uid: ' + uid);
	
    var params = {
        "operationName": "loyalty",
        "variables": {
            "uid": uid,
            "location": {}
        },
        "query": "query loyalty($uid: ID!, $location: LocationInput!) {\n  user(id: $uid) {\n    id\n    loyaltyInfo(location: $location) {\n      ...BaseLoyalty\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment BaseLoyalty on LoyaltyInfo {\n  currency\n  amount\n  __typename\n}\n"
    };
	
	html = AnyBalance.requestPost(baseurlApi + 'graphql?query_name=web?__loyalty__', JSON.stringify(params), addHeaders({
		'accept': '*/*',
		'Content-Type': 'application/json',
        'Referer': baseurl,
		'x-forwarded-for': ip,
        'x-request-id': requestId,
	}));
		
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	var info = json.data.user.loyaltyInfo[0]; // Получаем информацию только по первому балансу, другие в кабинете отсутствуют
	
	if (info){
	    getParam(info.amount, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	    getParam(g_currency[info.currency]||info.currency, result, ['currency', 'balance']);
	}else{
		AnyBalance.trace('Не удалось получить информацию о балансе');
	}
	
	var params = {
        "operationName": "getSubscriptions",
        "variables": {
            "language": "RU"
        },
        "query": "query getSubscriptions($language: TRANSITION_LANGUAGE!) {\n  userState {\n    subscriptions {\n      ... on UserStateSubscription {\n        ...BaseSubscriptionNoAsset\n        asset(language: $language) {\n          ...BaseSubscriptionAsset\n          __typename\n        }\n        __typename\n      }\n      ... on UserStateFrozenItem {\n        ...BaseUserStateFrozenItemNoAsset\n        asset(language: $language) {\n          ...BaseSubscriptionAsset\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment BaseSubscriptionNoAsset on UserStateSubscription {\n  actions {\n    ...BaseSubscriptionAction\n    __typename\n  }\n  coveredBy\n  end\n  familyManageAccess\n  features {\n    ...BaseSubscriptionFeature\n    __typename\n  }\n  grace\n  id\n  nextPayment {\n    price {\n      ...BasePrice\n      __typename\n    }\n    date\n    __typename\n  }\n  partnerId\n  partnerUserId\n  subscriptionOrderId\n  product\n  purchasedTo\n  service\n  start\n  status\n  stopped\n  tariff\n  type\n  vendor\n  trialPeriod\n  commonPrice {\n    ...BasePrice\n    __typename\n  }\n  commonPeriod\n  freezeCampaigns {\n    campaign\n    description\n    type\n    period\n    __typename\n  }\n  familyRole\n  partnerData {\n    ...PartnerData\n    introPeriod\n    __typename\n  }\n  __typename\n}\n\nfragment BaseSubscriptionAsset on SubscriptionAsset {\n  title\n  purchasedToTitle\n  __typename\n}\n\nfragment BaseUserStateFrozenItemNoAsset on UserStateFrozenItem {\n  commonPeriod\n  commonPrice {\n    ...BasePrice\n    __typename\n  }\n  features {\n    ...BaseSubscriptionFeature\n    __typename\n  }\n  freezeCampaign\n  freezeEnd\n  freezeId\n  freezePeriod\n  id\n  paidMillis\n  partnerId\n  potentialNextPaymentDate {\n    price {\n      ...BasePrice\n      __typename\n    }\n    date\n    __typename\n  }\n  product\n  purchasedTo\n  service\n  tariff\n  type\n  vendor\n  __typename\n}\n\nfragment BaseSubscriptionAction on SubscriptionAction {\n  offerId\n  offerTo\n  type\n  __typename\n}\n\nfragment BaseSubscriptionFeature on SubscriptionFeature {\n  feature\n  familyFor\n  __typename\n}\n\nfragment BasePrice on Price {\n  currency\n  amount\n  __typename\n}\n\nfragment PartnerData on PartnerData {\n  partnerName\n  partnerUserId\n  __typename\n}\n"
    };

    html = AnyBalance.requestPost(baseurlApi + 'graphql?query_name=web?__getSubscriptions__', JSON.stringify(params), addHeaders({
		'accept': '*/*',
		'Content-Type': 'application/json',
        'Referer': baseurl,
		'x-forwarded-for': ip,
        'x-request-id': requestId,
	}));
		
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	var subs = json.data.userState.subscriptions; // Получаем информацию по всем подпискам в кабинете
    if (subs && subs.length>0){
		for(var i=0; i<subs.length; ++i){
			var pinfo = subs[i];
			if(pinfo.product == 'TARIFF'){ // Получаем названия тарифа(ов)
		        sumParam(g_type[pinfo.tariff]||pinfo.tariff, result, '__tariff', null, null, null, create_aggregate_join(' + '));
			}
			if(pinfo.product == 'SERVICE'){ // Получаем названия доп. опций
		        sumParam(pinfo.asset && pinfo.asset.title, result, '__tariff', null, null, null, create_aggregate_join(' + '));
				sumParam(pinfo.commonPrice && pinfo.commonPrice.amount, result, 'priceadds', null, null, parseBalance, aggregate_sum);
			}
		}
	    var info = subs[0]; // Получаем подробную информацию только по основному тарифу (Плюсу)
	    if (info){
	        getParam(g_status[info.status]||info.status, result, 'status', null, replaceTagsAndSpaces);
	    	if (info.familyRole != 'CHILD'){ // Пропускаем получение этих счетчиков для участников семейной группы, они всегда отсутствуют
	    	    getParam(info.commonPrice && info.commonPrice.amount, result, 'price', null, replaceTagsAndSpaces, parseBalance);
	            getParam(info.nextPayment && info.nextPayment.price && info.nextPayment.price.amount, result, 'nextpaymentamount', null, replaceTagsAndSpaces, parseBalance);
	            getParam(info.nextPayment && info.nextPayment.date, result, 'nextpaymentdate', null, replaceTagsAndSpaces, parseDateISO);
	    	}
	    	getParam(g_role[info.familyRole]||info.familyRole, result, 'role', null, replaceTagsAndSpaces);
			getParam(info.start, result, 'starteddate', null, replaceTagsAndSpaces, parseDateISO);
	    	var expDate = getParam(info.end, result, 'expiresdate', null, replaceTagsAndSpaces, parseDateISO);
			if (expDate){
			    if (AnyBalance.isAvailable('expiresdays')){
			    	var days = Math.ceil((expDate - (new Date().getTime())) / 86400 / 1000);
			    	if (days >= 0){
			            result.expiresdays = days;
			    	}else{
			    	    AnyBalance.trace('Дата окончания подписки уже наступила');
			    		result.expiresdays = 0;
			    	}
			    }	
 		    }else{
 		    	AnyBalance.trace('Не удалось получить дату окончания подписки');
 		    }
	    }else{
	    	AnyBalance.trace('Не удалось получить информацию о подписке');
	    }
    }else{
		AnyBalance.trace('Не удалось получить информацию о подписках');
	}
	
	if (AnyBalance.isAvailable(['users', 'participants'])) {
	    html = AnyBalance.requestPost(baseurl + 'api/blackbox_family_info?', JSON.stringify({}), addHeaders({'Referer': AnyBalance.getLastUrl()}));
	    	
	    var json = getJson(html);
	    AnyBalance.trace(JSON.stringify(json));
	    
	    if (json && json.users && json.users.length>0){
	    	getParam(json.users.length, result, 'users', null, replaceTagsAndSpaces, parseBalance);
	    	for(var i=0; i<json.users.length; ++i){
	    	    sumParam(json.users[i].info.display_name.name, result, 'participants', null, null, null, create_aggregate_join(',<br> '));
	    	}
	    }else{
	    	AnyBalance.trace('Не удалось получить информацию о составе группы');
	    }
	}
	
	if (AnyBalance.isAvailable(['lastoperationdate', 'lastoperationsum', 'lastoperationtype'])) {
	    html = AnyBalance.requestGet('https://id.yandex.ru/pay/history', g_headers); // Получаем информацию по истории платежей
	
	    var data = getJsonObject(html, /"Transaction:[\d\w]*":/);// Получаем информацию только по последней по времени операции
	
	    if (data){
	    	AnyBalance.trace(JSON.stringify(data));
	    	getParam(data.created, result, 'lastoperationdate', null, replaceTagsAndSpaces, parseDateISO);
	        getParam(data.rootPayment.total, result, 'lastoperationsum', null, replaceTagsAndSpaces, parseBalance);
//	    	getParam(data.plus, result, 'lastoperationballs', null, replaceTagsAndSpaces, parseBalance); // Яндекс убрал пункт о начисленных по операции баллах
            for(var i=0; i<data.rootPayment.basket.length; ++i){
		        sumParam(data.rootPayment.basket[i].name, result, 'lastoperationtype', null, null, null, create_aggregate_join(',<br> '));
		    }
	    }else{
	    	AnyBalance.trace('Не удалось получить информацию о последней операции');
	    }
	}
	
	if (AnyBalance.isAvailable(['freshmail', 'unreadmail'])) {
	    html = AnyBalance.requestGet('https://mail.yandex.ru/api/v2/serp/counters?silent', addHeaders({'Referer': 'https://passport.yandex.ru/'}));
	    	
	    var json = getJson(html);
	    AnyBalance.trace(JSON.stringify(json));
        
	    getParam(json.counters.fresh, result, 'freshmail', null, replaceTagsAndSpaces, parseBalance);
	    getParam(json.counters.unread, result, 'unreadmail', null, replaceTagsAndSpaces, parseBalance);
	}
	
	if (AnyBalance.isAvailable(['email', 'accname', 'fio'])) {
	    html = AnyBalance.requestGet('https://api.passport.yandex.ru/all_accounts', addHeaders({'Referer': 'https://passport.yandex.ru/'}));
	    	
	    var json = getJson(html);
	    AnyBalance.trace(JSON.stringify(json));
	    
	    var info = json.accounts[0]; // Получаем информацию только по первому аккаунту
	    
	    if (info){
	    	getParam(info.defaultEmail, result, 'email', null, replaceTagsAndSpaces);
	    	getParam(info.displayName.name, result, 'accname', null, replaceTagsAndSpaces);
	    	var fio = info.displayName.firstname; // Если пользователь не указал в профиле фамилию, значение свойства "fio" имеет вид "Имя null", поэтому делаем в виде сводки
	        if (info.displayName.lastname)
	        	fio += ' ' + info.displayName.lastname;
	        getParam(fio, result, 'fio', null, replaceTagsAndSpaces);
	    }else{
	    	AnyBalance.trace('Не удалось получить информацию об аккаунте');
	    }
	}

    AnyBalance.setResult(result);

}
