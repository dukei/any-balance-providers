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
			"__forceAvailable": ["payments.sum", "payments.date"],
			"balance": "balance",
			"__tariff": "tariff",
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
//			"history_income": "payments.sum",
//			"history_out": "payments.sum",
//			"history": "payments.sum",
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
    adapter.processBalance = adapter.envelope(processBalance);

	var result = {success: true};
    adapter.processInfo(result);
    adapter.processBalance(result);
    adapter.processRemainders(result);
    adapter.processPayments(result);

    var newresult = adapter.convert(result);
	
	if(result.payments) {
		for (var i = 0; i < result.payments.length; ++i) {
			var p = result.payments[i];

			sumParam(fmtDate(new Date(p.date), '.') + ' ' + p.sum, newresult, 'history', null, null, null, aggregate_join);
			if (/^-/.test(p.sum)) {
				sumParam(p.sum, newresult, 'history_out', null, null, null, aggregate_sum);
			} else {
				sumParam(p.sum, newresult, 'history_income', null, null, null, aggregate_sum);
			}
		}
	}
    
    AnyBalance.setResult(newresult);
};

