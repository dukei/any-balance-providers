/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru,en-US;q=0.9,en;q=0.8,ru-RU;q=0.7',
    'Cache-Control':'max-age=0',
    Connection:'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36'
};

var g_countersTable = {
	common: {
		"balance": "balance",
		"available": "available",
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
		"status_stop_content": "status_stop_content",
		"gb_with_you": "remainders.gb_with_you",
		"internet_roam_other": "remainders.internet_roam_other",
		"internet_roam_popular": "remainders.internet_roam_popular",
		"internet_roam_europe": "remainders.internet_roam_europe",
		"internet_auto_prolong": "remainders.internet_auto_prolong",
		"internet_cur": "remainders.internet_cur",
		"internet_cur_night": "remainders.internet_cur_night",
		"internet_total": "remainders.internet_total",
		"internet_total_night": "remainders.internet_total_night",
		"internet_till": "remainders.internet_till",
		"mins_total": "remainders.mins_total",
		"mins_net_total": "remainders.mins_net_total",
		"sms_total": "remainders.sms_total",
		"mms_total": "remainders.mms_total",
		"credit": "credit",
		"sub_scl": "sub_scl",
		"last_pay_sum": "payments.sum",
		"last_pay_date": "payments.date",
		"phone": "phone",
		"__tariff": "tariff"
	}
};


function main(){
	var prefs = AnyBalance.getPreferences();

	megafonLkAPILoginNew();
	
	function shouldProcess(counter, info){ return true }
    var adapter = new NAdapter(g_countersTable.common, shouldProcess);
	
    adapter.megafonLkAPIDo = adapter.envelope(megafonLkAPIDo);
	
	var result = {success: true};
	
	adapter.megafonLkAPIDo({}, result);
	result = adapter.convert(result);

	setCountersToNull(result);
	
	AnyBalance.setResult(result);
}
