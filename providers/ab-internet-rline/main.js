/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для дагестанского интернет-провайдера Эрлайн.
*/

function main(){
    var prefs = AnyBalance.getPreferences();

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://state.r-line.ru:8443/bgbilling/webexecuter";

    getBGBillingResult(baseurl, {login: prefs.login, password: prefs.password});
}
