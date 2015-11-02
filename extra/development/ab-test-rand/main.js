/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main() {
	var prefs = AnyBalance.getPreferences();
	
	var result = {
		success: true,
		balance: null
	};
	
	if(!prefs.return_null)
		getParam((Math.random() * 10000).toFixed(2) + '', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	
	getParam((Math.random() * 10000).toFixed(2) + '', result, 'balance2', null, replaceTagsAndSpaces, parseBalance);
	getParam((Math.random() * 10000).toFixed(2) + '', result, 'balance3', null, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}