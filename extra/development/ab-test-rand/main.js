/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main() {
	var prefs = AnyBalance.getPreferences();
	
	if(prefs.bad_behavior) {
		bad/100;
	}
	
	var result = {
		success: true,
		balance: null,
		balance2: null,
		text_counter: null,
		currency: ' р',
		hidden: 'hidden counter' // счетчик, который не объявлен в манифесте и он нигде не используется
		
	};
	
	if(!prefs.return_null) {
		getParam((Math.random() * 10000).toFixed(2) + '', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
		getParam((Math.random() * 10).toFixed(0) + '', result, 'balance2', null, replaceTagsAndSpaces, parseBalance);
		getParam((Math.random() * 10000).toFixed(2) + '', result, 'balance3', null, replaceTagsAndSpaces, parseBalance);
		getParam((Math.random() * 10000).toFixed(2) + '', result, 'text_counter');
	}
	
	AnyBalance.setResult(result);
}