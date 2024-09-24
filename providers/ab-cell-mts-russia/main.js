/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */

function main() {
    var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setOptions({
		CLIENT: 'okhttp', 
		PER_DOMAIN: {
			'ihelper.mts.ru': {
				SSL_ENABLED_PROTOCOLS: ['TLSv1', 'TLSv1.1', 'TLSv1.2']
			}
		}
	});
	
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
		"sms_total": "remainders.sms_total",
		"min_used": "remainders.min_used",
		"min_total": "remainders.min_total",
		"min_love": "remainders.min_love",
		"min_used_mts": "remainders.min_used_mts",
		"min_left_mts": "remainders.min_left_mts",
		"min_left_mts_rf": "remainders.min_left_mts_rf",
		"tourist": "remainders.tourist",
		"traffic_used_total_mb": "expenses.traffic_used_total_mb",
		"abonservice": "expenses.abonservice",
		"refill": "expenses.refill",
		"total_msg": "messages.total_msg",
		"unread_msg": "messages.unread_msg",
		"debt": "debt",
		"pay_till": "pay_till",
		"min_till": "remainders.min_till",
		"traffic_left_till": "remainders.traffic_left_till",
		"sms_till": "remainders.sms_till",
		"mms_till": "remainders.mms_till",
		"traffic_left_mb": "remainders.traffic_left_mb",
		"traffic_used_mb": "remainders.traffic_used_mb",
		"traffic_total_mb": "remainders.traffic_total_mb",
		"traffic_used_by_acceptors_mb": "remainders.traffic_used_by_acceptors_mb",
		"cashback": "remainders.cashback",
		"cashback_mts": "remainders.cashback_mts",
		"cashback_mts_pending": "remainders.cashback_mts_pending",
		"cashback_mts_burning": "remainders.cashback_mts_burning",
		"cashback_mts_burning_date": "remainders.cashback_mts_burning_date",
		"premium_state": "remainders.premium_state",
		"statuslock": "remainders.statuslock",
		"credit": "remainders.credit",
		"services": "remainders.services",
		"services_paid": "remainders.services_paid",
		"services_free": "remainders.services_free",
		"services_abon": "remainders.services_abon",
		"services_abon_day": "remainders.services_abon_day",
		"usedinthismonth": "expenses.usedinthismonth",
		"usedinprevmonth": "expenses.usedinprevmonth",
		"license": "info.licschet",
		"region": "info.region",
		"phone": "info.phone",
		"fio": "info.fio",
		"bonus_balance": "remainders.bonus_balance",
		"sms_left_perezvoni": "remainders.sms_left_perezvoni",
		"last_pay_sum": "payments.sum",
		"last_pay_date": "payments.date",
		"last_pay_descr": "payments.descr",
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
