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
	
	if(prefs.country == 'kz') {
		AnyBalance.setCookie('my.beeline.kz', 'ui.language.current', 'ru_RU');
	} else {
		if(prefs.source == 'app') {
			if(canUseMobileApp(prefs)) {
				proceedWithMobileAppAPI(baseurl, prefs);
				return;
			} else {
				AnyBalance.trace('Невозможно обновить данные через API мобильного приложения, пробуем войти через сайт...');
			}
		}
	}
	
	try {
		if(prefs.country == 'kz')
			proceedWithSiteKz(baseurl);
		else
			mainRu(baseurl);
	} catch(e){
		if(e.fatal)
			throw e;
		//Обломался сайт. Если можно мобильное приложение, давайте его попробуем
		if(canUseMobileApp(prefs)) {
			AnyBalance.trace('Не получается зайти в личный кабинет: ' + e.message + ', ' + e.stack + '. Попробуем мобильное приложение');
			proceedWithMobileAppAPI(baseurl, prefs, true);
			return;
		}else{
			throw e;
		}
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
		"prebal": "prebal",
		"overpay": "overpay",
		"credit": "credit",
		"sms_left": "remainders.sms_left",
		"mms_left": "remainders.mms_left",
		"rub_bonus": "remainders.bonus",
		"rub_bonus2": "remainders.rub_bonus2",
		"rub_bonus2_till": "remainders.rub_bonus2_till",
		"min_bi": "remainders.min_bi",
		"min_local": "remainders.min_local",
		"rub_opros": "remainders.rub_opros",
		"traffic_left": "remainders.traffic_left",
		"traffic_left_night": "remainders.traffic_left_night",
		"traffic_bonus": "remainders.traffic_bonus",
		"min_left_1": "remainders.min_left_1",
		"min_left_2": "remainders.min_left_2",
		"fio": "info.fio",
		"phone": "info.phone",
		"agreement": "agreement",
		"total_balance": "total_balance",
		"traffic_used": "remainders.traffic_used",
		"traffic_total": "remainders.traffic_total",
		"min_local_till": "remainders.min_local_till",
		"__tariff": "tariff"
	}
};

function mainRu(baseurl){
	var prefs = AnyBalance.getPreferences();

	checkEmpty(prefs.password, 'Введите пароль!');

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