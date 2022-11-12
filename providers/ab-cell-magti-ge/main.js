
/**
Провайдер AnyBalance (https://github.com/dukei/any-balance-providers/)
*/

function main() {
	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	prefs.login=prefs.login.replace(/([^\d]*)/g,'').substr(-9);
	if (!/\d{9}/i.test(prefs.login)) throw new AnyBalance.Error(
		'Номер телефона должен быть без пробелов и разделителей, в формате XXXXXXXXX!');

	var baseurl = "https://rest.magticom.ge/mymagti-rest-safe/rest";
	AnyBalance.setDefaultCharset('utf-8');

	var html = AnyBalance.requestPost('https://oauth.magticom.ge/auth/oauth/token?grant_type=password', {
		username: prefs.login,
		password: prefs.password,
		client_id: 'MymagtiAppNew',
		}, {
			Authorization: 'Basic TXltYWd0aUFwcE5ldzpQaXRhbG9AI2RkZWVyYWFzYXNERjIxMyQl',
		});
	var json=getJson(html);
	token=json.access_token;
	if (!json.access_token)
		throw new AnyBalance.Error('Ошибка авторизции',null,true);

	html = AnyBalance.requestGet(baseurl + '/subscriber/account/group?phoneNumber='+prefs.login,
	{
		Authorization: 'Bearer '+token
	});
	AnyBalance.trace(html);
	var json=getJson(html);

	// Получаем данные о балансе
	var result = { success: true };
	var groups = {};
	for (var i = 0; i < json.data.length; i++) {
		groups[json.data[i].accountGroup] = json.data[i];
	}

	getParam(groups.BALANCE.balance, result, 'balance');
	getParam('+995 ' + prefs.login, result, 'phone');
	if (groups.INTERNET) {
		getParam(groups.INTERNET.expDate, result, 'traffic_till',null,null,parseDate);
		getParam(groups.INTERNET.balance === 'Unlimited' ? 9999999 : groups.INTERNET.balance, result, 'traffic_left');
	}
	AnyBalance.setResult(result);
}
