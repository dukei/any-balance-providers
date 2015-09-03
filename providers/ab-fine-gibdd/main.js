/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	"balance": "balance",
	"count": "count",
	"date": "fines.date",
	"koap": "fines.koap",
	"descr": "fines.descr",
	"podrazdel": "fines.podrazdel",
	"postanovlenie": "fines.postanovlenie",
	"summ": "fines.summ",
	"all": "all",
};

function main() {
	var prefs = AnyBalance.getPreferences();
	
    var adapter = new NAdapter(g_countersTable, shouldProcess, {shouldProcessMultipleCalls: {fines: true}});
	
	var result = {success: true, balance: 0};
	
	adapter.requestFines = adapter.envelope(requestFines);
	adapter.parseFines = adapter.envelope(parseFines);
	var json = adapter.requestFines(prefs);
	adapter.parseFines(result, json);
	
	// Теперь нужна сводка
	if(isAvailable('all')) {
		var all = '';
		for(var i = 0; i< json.request.count; i++) {
			var curr = json.request.data[i];
			all += '<b>' + curr.NumPost + ' от ' + curr.DateDecis + '</b>: ' + curr.KoAPtext.toUpperCase().substring(0,1) + curr.KoAPtext.toLowerCase().substring(1) + ': <b>' + curr.Summa + ' р.</b><br/><br/>';
		}
		getParam(all, result, 'all', null, [/<br\/><br\/>$/i, '']);
	}
	// Только потом конвертим
	var result = adapter.convert(result);
	
	result.__tariff = prefs.login.toUpperCase();
	AnyBalance.setResult(result);
}

function shouldProcess(counter, info) {return true;}