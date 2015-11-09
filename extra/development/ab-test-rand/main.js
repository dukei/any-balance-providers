/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main() {
	var prefs = AnyBalance.getPreferences();
	
	var result = {
		success: true,
		balance: null,
		balance2: null,
		text_counter: null,
		hidden: 'hidden counter' // счетчик, который не объявлен в манифесте
	};
	
	if(!prefs.return_null) {
		getParam((Math.random() * 10000).toFixed(2) + '', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
		getParam((Math.random() * 10000).toFixed(2) + '', result, 'balance2', null, replaceTagsAndSpaces, parseBalance);
		getParam((Math.random() * 10000).toFixed(2) + '', result, 'text_counter');
	}
	
	AnyBalance.setResult(result);
}