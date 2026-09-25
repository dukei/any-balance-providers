/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

*/

var g_currency = {
    руб: '₽',
	RUB: '₽',
    RUR: '₽',
    undefined: ''
}

var g_savedData;

if(typeof SavedData === 'undefined') var SavedData = { load: function(){ return {}; }, save: function(){} };

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
    AnyBalance.trace('Пробуем войти в личный кабинет...');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите 10 цифр номера телефона без пробелов и разделителей в качестве логина!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var baseurl = 'https://www.beeline.ru/';
	
	if(prefs.source == 'app')
		baseurl = 'https://my.beeline.ru/';
	
	if(!g_savedData)
		g_savedData = new SavedData('beeline-mobile-site', prefs.login);
	
	switch(prefs.source){
    case 'site':
        mainRu(baseurl);
        break;
    case 'app':
        proceedWithMobileAppAPI(baseurl);
        break;
    case 'auto':
    default:
        try{
			mainRu(baseurl);
        }catch(e){
            if(e.fatal)
                throw e;
			AnyBalance.trace('Не удалось получить данные с официального сайта: ' + e.message + ' (' + e.stack + ')');
            throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?'); // API пока не работает, нет смысла к нему переходить
			clearAllCookies();
            proceedWithMobileAppAPI(baseurl);
        }
        break;
	}
}

var g_countersTable = {
	common: {
		"balance": "balance",
		"unified_balance": "unified_balance",
		"addon_balance": "addon_balance",
		"prebal": "prebal",
		"overpay": "overpay",
		"credit": "credit",
		"sms_left": "remainders.sms_left",
		"mms_left": "remainders.mms_left",
		"rub_bonus": "remainders.rub_bonus",
		"rub_bonus2": "remainders.rub_bonus2",
		"rub_bonus2_till": "remainders.rub_bonus2_till",
		"min_bi": "remainders.min_bi",
		"min_local": "remainders.min_local",
		"rub_opros": "remainders.rub_opros",
		"rub_opros_till": "remainders.rub_opros_till",
		"traffic_left": "remainders.traffic_left",
		"traffic_rouming": "remainders.traffic_rouming",
		"traffic_tethering": "remainders.traffic_tethering",
		"traffic_left_night": "remainders.traffic_left_night",
		"traffic_bonus": "remainders.traffic_bonus",
		"min_left_1": "remainders.min_left_1",
		"min_left_2": "remainders.min_left_2",
		"min_left_3": "remainders.min_left_3",
		"fio": "info.fio",
		"phone": "info.phone",
		"agreement": "info.agreement",
		"type": "type",
		"total_balance": "total_balance",
		"traffic_used": "remainders.traffic_used",
		"traffic_used_4g": "traffic_used_4g",
		"traffic_used_total": "traffic_used_total",
		"traffic_total": "remainders.traffic_total",
		"min_local_till": "remainders.min_local_till",
		"services_abon": "services_abon",
		"services_abon_day": "services_abon_day",
		"subscriptions_count": "subscriptions_count",
		"honeycomb": "honeycomb",
		"services_count": "services_count",
		"services_paid": "services_paid",
		"services_free": "services_free",
		"month_refill": "month_refill",
		"last_pay_date": "payments.date",
		"last_pay_sum": "payments.sum",
		"last_pay_place": "payments.place",
		"next_billing_date": "next_billing_date",
		"statuslock": "statuslock",
		"debet": "debet",
		"abon_tariff": "abon_tariff",
		"__tariff": "tariff"
	}
};

function mainRu(baseurl){
	var prefs = AnyBalance.getPreferences();

	var ret = login(baseurl);

	function shouldProcess(counter, info){ return true }
    var adapter = new NAdapter(g_countersTable.common, shouldProcess);
    adapter.proceedWithSite = adapter.envelope(proceedWithSite);

	var result = {success: true};
	
	adapter.proceedWithSite(baseurl, ret.type, ret.html, ret.json, result);
	
	var newresult = adapter.convert(result);
	newresult.currency = result.currency;

	setCountersToNull(newresult);

	AnyBalance.setResult(newresult);
}

function proceedWithMobileAppAPI(baseurl){
	var prefs = AnyBalance.getPreferences();

	var result = {success: true};

	function shouldProcess(counter, info){ return true }
    var adapter = new NAdapter(g_countersTable.common, shouldProcess);
    adapter.processApi = adapter.envelope(processApi);

	var ret = apiLogin(baseurl);
	result.password = ret && ret.password;

	switchToAssocNumber(prefs.phone);

	adapter.processApi(result);

	var newresult = adapter.convert(result);
	newresult.currency = result.currency;

	setCountersToNull(newresult);

	AnyBalance.setResult(newresult);
}
