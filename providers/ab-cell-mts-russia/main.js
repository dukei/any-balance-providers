/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */

function main() {
    var prefs = AnyBalance.getPreferences();

    if(prefs.__initialization)
	    return initialize();

    var result = {success: true};

    var html = login(result);

	function shouldProcess(counter, info){ return true }
    var adapter = new NAdapter(g_countersTable.common, shouldProcess);
	
    adapter.mainLK = adapter.envelope(mainLK);
	
    adapter.mainLK(html, result);
    var were_errors = result.were_errors;

	result = adapter.convert(result);
    if(were_errors)
    	setCountersToNull(result);

    AnyBalance.setResult(result);
}

var g_countersTable = {
	common: {
		"balance": "balance",
		"bonus": "bonus",
		"min_local": "remainders.min_local",
		"min_left": "remainders.min_left",
		"min_left_mezh": "remainders.min_left_mezh",
		"min_left_connect": "remainders.min_left_connect",
		"sms_left": "remainders.sms_left",
		"sms_europe": "remainders.sms_europe",
		"sms_world": "remainders.sms_world",
		"mms_left": "remainders.mms_left",
		"sms_used": "remainders.sms_used",
		"min_used": "remainders.min_used",
		"min_love": "remainders.min_love",
		"min_used_mts": "remainders.min_used_mts",
		"min_left_mts": "remainders.min_left_mts",
		"min_left_mts_rf": "remainders.min_left_mts_rf",
		"tourist": "remainders.tourist",
		"abonservice": "abonservice",
		"debt": "debt",
		"pay_till": "pay_till",
		"min_till": "remainders.min_till",
		"traffic_left_till": "remainders.traffic_left_till",
		"sms_till": "remainders.sms_till",
		"mms_till": "remainders.mms_till",
		"traffic_left_mb": "remainders.traffic_left_mb",
		"traffic_used_mb": "remainders.traffic_used_mb",
		"statuslock": "statuslock",
		"credit": "credit",
		"usedinthismonth": "usedinthismonth",
		"usedinprevmonth": "usedinprevmonth",
		"license": "info.licschet",
		"monthlypay": "monthlypay",
		"phone": "info.phone",
		"bonus_balance": "remainders.bonus_balance",
		"sms_left_perezvoni": "remainders.sms_left_perezvoni",
		"last_pay_date": "payments.date",
		"last_pay_sum": "payments.sum",
		"__tariff": "tariff"
	}
};


function initialize(){
	var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login, 'Введите телефон (логин)!');

	var ret = loginWithoutPassword(); 

	var result = {success: true, __initialization: true, login: prefs.login, password: ret.password};

    AnyBalance.setResult(result);
}

