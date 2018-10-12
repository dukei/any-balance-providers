/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main() {
	var prefs = AnyBalance.getPreferences();
	
	var result = {success: true};
	
	loginAndGetBalance(prefs, result);

	if(AnyBalance.isAvailable('no_cashback_count')){
		var hist = getCombinedHistory().filter(function(h) { return !!h.flags['is-meta-ycard-operation'] });
		var emptyOpCount = 0;
		for(var i=0; i<hist.length; ++i){
			if(!hist[i].__balls){
				++emptyOpCount;
				continue;
			}
			if(/за пятый/i.test(hist[i].__balls.name))
				break;
		}
		getParam(emptyOpCount, result, 'no_cashback_count');
	}

	AnyBalance.setResult(result);
}