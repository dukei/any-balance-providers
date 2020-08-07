/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт банка Тинькофф Кредитные Системы, используя систему Интернет-Банк.
*/

function main(){
	login();
	
	var result = {success: true};

	processInfo(result);

	AnyBalance.setResult(result);
}
