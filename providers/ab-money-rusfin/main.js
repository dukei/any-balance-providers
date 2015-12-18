/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
    var prefs = AnyBalance.getPreferences();
	
	var result = {success: true};
	
	login(prefs);
	processCredit(prefs, result);
	processUserProfile(result);
	
    AnyBalance.setResult(result);
}