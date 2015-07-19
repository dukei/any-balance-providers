/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
	var html = login();

	var result = {success: true};

	processInfo(html, result);
	processTemplates(html, result);

//	processAccounts(html, result);

	AnyBalance.setResult(result);
}
