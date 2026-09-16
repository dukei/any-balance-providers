/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	common: {
		"balance": "balance",
		"mins_left": "remainders.mins_left",
		"mins_net_left": "remainders.mins_net_left",
		"mins_n_free": "remainders.mins_n_free",
		"mins_day": "remainders.mins_day",
		"internet_left": "remainders.internet_left",
		"internet_left_night": "remainders.internet_left_night",
		"internet_left_crimea": "remainders.internet_left_crimea",
		"sms_left": "remainders.sms_left",
		"mms_left": "remainders.mms_left",
		"bonus_balance": "bonus_balance",
		"bonus_status": "bonus_status",
		"bonus_burn": "bonus_burn",
		"megapowers": "megapowers",
		"services_free": "services_free",
		"services_paid": "services_paid",
		"services_count": "services_count",
		"services_abon": "services_abon",
		"services_abon_day": "services_abon_day",
		"personal_offers": "personal_offers",
		"gb_with_you": "remainders.gb_with_you",
		"internet_roam_other": "remainders.internet_roam_other",
		"internet_roam_popular": "remainders.internet_roam_popular",
		"internet_roam_europe": "remainders.internet_roam_europe",
		"internet_auto_prolong": "remainders.internet_auto_prolong",
		"internet_cur": "remainders.internet_cur",
		"internet_cur_night": "remainders.internet_cur_night",
		"internet_cur_total": "remainders.internet_cur_total",
		"internet_total": "remainders.internet_total",
		"internet_total_night": "remainders.internet_total_night",
		"internet_till": "remainders.internet_till",
		"mins_total": "remainders.mins_total",
		"mins_net_total": "remainders.mins_net_total",
		"sms_total": "remainders.sms_total",
		"mms_total": "remainders.mms_total",
		"available": "available",
		"own": "own",
		"credit": "credit",
		"cashback": "cashback",
		"sub_scl": "sub_scl",
		"sub_smit": "sub_smit",
		"month_refill": "month_refill",
		"last_pay_sum": "payments.sum",
		"last_pay_date": "payments.date",
		"last_pay_descr": "payments.descr",
		"next_billing_date": "next_billing_date",
		"statuslock": "statuslock",
		"add_num": "add_num",
		"add_num2": "add_num2",
		"add_num3": "add_num3",
		"license": "info.license",
		"region_name": "info.region_name",
		"filial": "info.filial",
		"fio": "info.fio",
		"phone": "phone",
		"__tariff": "tariff"
	}
};

function main(){
	var prefs = AnyBalance.getPreferences();
	var options = {allow_captcha: true};

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите 10 цифр номера телефона без пробелов и разделителей в качестве логина!');
	
	AnyBalance.restoreCookies();
	
	AnyBalance.trace('Пробуем войти через API мобильного приложения...');
	
	getAdditionalXCabinetHeaders();
	
	if(prefs.use_password && prefs.password){
		megafonLkAPILogin(options);
	}else{
		megafonLkAPILoginNew(options);
	}
	
	AnyBalance.saveCookies();
	AnyBalance.saveData();
	
	function shouldProcess(counter, info){ return true }
    var adapter = new NAdapter(g_countersTable.common, shouldProcess);
	
    adapter.megafonLkAPIDo = adapter.envelope(megafonLkAPIDo);
	
	var result = {success: true};
	
	adapter.megafonLkAPIDo(options, result);
	result = adapter.convert(result);

	setCountersToNull(result);
	
	AnyBalance.setResult(result);
}
