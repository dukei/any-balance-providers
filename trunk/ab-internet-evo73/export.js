/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Acucept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	// Mobile
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	// Desktop
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function getName(type_id){
	return {
		14: 'Интернет',
		50: 'Телефон',
		111: 'Телевидение'
	}[type_id] || 'Неизвестный сервис (' + type_id + ')';
}

function getStatus(statusid){
    
    statusid = {
        '-15': -1,
        '-25': -10 
    }[statusid] || statusid;

	return {
		1: 'Работает',
		'-1': 'Не работает (не хватает средств)',
		10: 'Работает всегда',
		'-10': 'Заблокирована',
		'-20': 'Удалена',
	}[statusid] || 'Неизвестный статус (' + statusid + ')';
}

var g_baseurl = 'https://www.evo73.ru:3085/';
function login() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestPost(g_baseurl + 'fr/login/login/', {
		lname: prefs.login,
		lpass: prefs.password
	}, g_headers);

	var json = getJson(html);
	if(json.status != 'OK'){
		var error = getParam(html, null, null, /<div[^>]+id="message"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /логин должно содержать|неверная комбинация/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	return json.results.lksid;
}

function fetchAccounts(lksid, result){
    html = AnyBalance.requestPost(g_baseurl + 'a/bill/customer/', {lksid: lksid}, g_headers);
    var json = getJson(html);
	
	getParam(json.results.FIO, result, 'fio');
	getParam(json.results.MOB_PHONE, result, 'phone');
	
	if(AnyBalance.isAvailable('accounts')){
		if(json.results.services)
			result.accounts = [];

		for(var i=0; json.results.services && i<json.results.services.length; ++i){
			var service = json.results.services[i];
	    
	        var a = {__id: service.ACCOUNT_ID, __name: getName(service.TYPE_ID)};
	        if(__shouldProcess('accounts', a)){
	        	getParam(service.MONEY, a, 'accounts.balance');
	        	getParam(service.ALL_COST, a, 'accounts.abon');
	        	getParam(service.TARIFF, a, 'accounts.plan');
	        	getParam(service.ACCOUNT + '', a, 'accounts.licschet');
	        	getParam(service.payment, a, 'accounts.topay');
	        	getParam(service.LOGIN, a, 'accounts.login');
	        	getParam(service.STATUS, a, 'accounts.status', null, null, getStatus);
	        }

	        result.accounts.push(a);
		}
	}
}