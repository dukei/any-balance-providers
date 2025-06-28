/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main() {
	var prefs = AnyBalance.getPreferences();
//	checkEmpty(prefs.password, 'Введите пароль!');

	login();

	doNewCabinet();
}

function doNewCabinet() {
	var countersTable = {
		common: {
			"__forceAvailable": ["payments.sum", "payments.date", "payments.descr"],
			"balance": "balance",
			"__tariff": "tariff",
			"tariff_abon": "tariff_abon",
			"tariff_till": "tariff_till",
			"statuslock": "statuslock",
			"min_left": "remainders.min_left",
			"traffic_left": "remainders.traffic_left",
			"sms_left": "remainders.sms_left",
			"mms_left": "remainders.mms_left",
			"min_till": "remainders.min_till",
			"traffic_till": "remainders.traffic_till",
			"sms_till": "remainders.sms_till",
			"mms_till": "remainders.mms_till",
			"min_used": "remainders.min_used",
			"traffic_used": "remainders.traffic_used",
			"sms_used": "remainders.sms_used",
			"mms_used": "remainders.mms_used",
			"min_total": "remainders.min_total",
			"traffic_total": "remainders.traffic_total",
			"sms_total": "remainders.sms_total",
			"min_roaming": "remainders.min_roaming",
			"traffic_roaming": "remainders.traffic_roaming",
			"sms_roaming": "remainders.sms_roaming",
			"min_roaming_till": "remainders.min_roaming_till",
			"traffic_roaming_till": "remainders.traffic_roaming_till",
			"sms_roaming_till": "remainders.sms_roaming_till",
			"expenses_curr_month": "expenses_curr_month",
			"expenses_prev_month": "expenses_prev_month",
			"services_total": "services.services_total",
		    "services_paid": "services.services_paid",
		    "services_free": "services.services_free",
			"services_abon": "services.services_abon",
			"month_refill": "month_refill",
			"last_payment_sum": "payments.sum",
			"last_payment_date": "payments.date",
			"last_payment_descr": "payments.descr",
			"phone": "info.mphone",
			"userName": "info.fio",
		}
	};

	function shouldProcess(counter, info){
		return true;
	}

    var adapter = new NAdapter(countersTable.common, shouldProcess);
	
    adapter.processInfo = adapter.envelope(processInfo);
    adapter.processRemainders = adapter.envelope(processRemainders);
    adapter.processPayments = adapter.envelope(processPayments);
	adapter.processExpenses = adapter.envelope(processExpenses);
    adapter.processBalance = adapter.envelope(processBalance);
	adapter.processServices = adapter.envelope(processServices);

	var result = {success: true};
    adapter.processInfo(result);
    adapter.processBalance(result);
    adapter.processRemainders(result);
    adapter.processPayments(result);
	adapter.processExpenses(result);
	adapter.processServices(result);

    var newresult = adapter.convert(result);
	
	if(result.payments && result.payments.length > 0) {
		for (var i = 0; i < result.payments.length; ++i) {
			var p = result.payments[i];

			sumParam(fmtDate(new Date(p.date), '.') + ' ' + p.sum + ' ₽', newresult, 'history', null, null, null, aggregate_join);
			if (/^-/.test(p.sum)) {
				sumParam(p.sum, newresult, 'history_out', null, null, null, aggregate_sum);
			} else {
				sumParam(p.sum, newresult, 'history_income', null, null, null, aggregate_sum);
			}
		}
		
		var lp = result.payments[0];
		
		getParam(lp.sum, newresult, 'last_payment_sum');
		getParam(lp.date, newresult, 'last_payment_date');
		getParam(lp.descr, newresult, 'last_payment_descr');
	}
    
    AnyBalance.setResult(newresult);
};

