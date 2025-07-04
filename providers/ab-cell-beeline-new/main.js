/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

*/

function main() {
	AnyBalance.setDefaultCharset('utf-8');
	
	var prefs = AnyBalance.getPreferences();

	var baseurl = 'https://my.beeline.' + (prefs.country || 'ru') + '/';

	if(prefs.__initialization){
		return initialize(baseurl);
	}
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	if(prefs.country == 'uz') {
	        main_uz();
	        return;
	}
	if(prefs.country == 'kz') {
		AnyBalance.setCookie('my.beeline.kz', 'ui.language.current', 'ru_RU');
	} else {
		if(prefs.source == 'app') {
			proceedWithMobileAppAPI(baseurl);
			return;
		}
	}
	
	try {
		if(prefs.country == 'kz')
			proceedWithSiteKz(baseurl);
		else
//			mainRu(baseurl); // Закрываем код сайта до лучших времён, чтобы зря не тратить трафик и время
		    proceedWithMobileAppAPI(baseurl);
	} catch(e){
//		if(e.fatal)
			throw e;
		//Обломался сайт. Если можно мобильное приложение, давайте его попробуем
//		AnyBalance.trace('Не получается зайти в личный кабинет: ' + e.message + ', ' + e.stack + '. Попробуем мобильное приложение');
//		clearAllCookies();
//		proceedWithMobileAppAPI(baseurl);
//		return;
	}
}

function initialize(baseurl){
	var prefs = AnyBalance.getPreferences();
	if(prefs.country && prefs.country != 'ru')
		throw new AnyBalance.Error('Автоматическое получение пароля пока поддерживается только для России!');

	var pass = createNewPassword(baseurl);
	var result = {success: true, __initialization: true, login: prefs.login, password: pass, country: 'ru'};
	AnyBalance.setResult(result);
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
		"traffic_left": "remainders.traffic_left",
		"traffic_rouming": "remainders.traffic_rouming",
		"traffic_left_night": "remainders.traffic_left_night",
		"traffic_bonus": "remainders.traffic_bonus",
		"min_left_1": "remainders.min_left_1",
		"min_left_2": "remainders.min_left_2",
		"min_left_3": "remainders.min_left_3",
		"fio": "info.fio",
		"phone": "info.phone",
		"agreement": "agreement",
		"type": "type",
		"total_balance": "total_balance",
		"traffic_used": "remainders.traffic_used",
		"traffic_used_4g": "traffic_used_4g",
		"traffic_used_total": "traffic_used_total",
		"traffic_total": "remainders.traffic_total",
		"min_local_till": "remainders.min_local_till",
		"services_abon": "services_abon",
		"services_abon_day": "services_abon_day",
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

	checkEmpty(prefs.password, 'Введите пароль!' );

	var ret = login(baseurl);

	function shouldProcess(counter, info){ return true }
    var adapter = new NAdapter(g_countersTable.common, shouldProcess);
    adapter.proceedWithSite = adapter.envelope(proceedWithSite);

	var result = {success: true};

	adapter.proceedWithSite(baseurl, ret.type, ret.html, result);
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
