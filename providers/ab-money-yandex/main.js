/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main() {
	var prefs = AnyBalance.getPreferences();
	
	var result = {success: true};
	
	loginAndGetBalance(prefs, result);
	
	AnyBalance.setResult(result);
}