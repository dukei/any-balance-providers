/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_countersTable = {
	"balance": "balance",
	"count": "count",
	"date": "fines.date",
	"koap": "fines.koap",
	"descr": "fines.descr",
	"dateDiscount": "fines.dateDiscount",
	"podrazdel": "fines.podrazdel",
	"postanovlenie": "fines.postanovlenie",
	"summ": "fines.summ",
	"all": "all",
};

var detailsDiscountPattern = '<s>%SUMM% р</s> (скидка 50% до %DATE_DISCOUNT%) = %SUM_DISCOUNT% р';
var detailsWithoutDiscountPattern = '%SUMM% р';

var detailsPattern = '<b>%POSTANOVLENIE% от %DATE_DECIS%</b>: %KOAP_TEXT%: <b>%PATTERN%</b><br/><br/>';

function main() {
	var prefs = AnyBalance.getPreferences();
	
    var adapter = new NAdapter(g_countersTable, shouldProcess, {shouldProcessMultipleCalls: {fines: true}});
	
	var result = {success: true, balance: 0};
	
	adapter.requestFines = adapter.envelope(requestFines);
	adapter.parseFines = adapter.envelope(parseFines);
	try{
		var json = adapter.requestFines(prefs);
		adapter.parseFines(result, json);
	}catch(e){
		if(/access denied/i.test(e.message)){
			var html = AnyBalance.requestGet('http://myip.ru/index_small.php', g_headers);
			var ip = getParam(html, null, null, /Ваш IP-адрес[\S\s]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
			throw new AnyBalance.Error('Похоже, ваш текущий IP ' + ip + ' заблокирован на www.gibdd.ru/check/fines. Попробуйте сменить тип соединения (Wifi/Мобильный интернет) или подключиться к другой WiFi сети, а затем обновите данные ещё раз. Можете также воспользоваться другим провайдером штрафов.');
		}
		throw e;
	}
	
	// Теперь нужна сводка
	if(isAvailable('all')) {
		var all = '';
		for(var i = 0; i< json.data.length; i++) {
			var curr = json.data[i];
			
			all += detailsPattern;
			all = all.replace('%POSTANOVLENIE%', curr.NumPost);
			all = all.replace('%DATE_DECIS%', curr.DateDecis);
			all = all.replace('%KOAP_TEXT%', curr.KoAPtext.toUpperCase().substring(0,1) + curr.KoAPtext.toLowerCase().substring(1));
			all = all.replace('%PATTERN%', isset(curr.SummaDiscount) ? detailsDiscountPattern : detailsWithoutDiscountPattern);
			all = all.replace('%SUMM%', curr.Summa);
			// Есть смысл заменять эти данные только в том случае, если скидка есть
			if(isset(curr.SummaDiscount)) {
				all = all.replace('%SUM_DISCOUNT%', curr.SummaDiscount);
				all = all.replace('%DATE_DISCOUNT%', curr.DateDiscount);	
			}
		}
		getParam(all, result, 'all', null, [/<br\/><br\/>$/i, '']);
	}
	// Только потом конвертим
	var result = adapter.convert(result);
	
	result.__tariff = prefs.login.toUpperCase();
	AnyBalance.setResult(result);
}

function shouldProcess(counter, info) {return true;}