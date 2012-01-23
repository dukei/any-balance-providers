/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Высокоскоростной интернет и цифровое телевидение Воля
Сайт оператора: http://volia.com
Личный кабинет: https://stat.volia.com:8443/ktvinet/main.do
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	var pass = prefs.pass;
	var login = prefs.login;
	var info = AnyBalance.requestGet('https://stat.volia.com:8443/ktvinet/vapi/jstat.jsp?code=' + login + '&pass=' + pass);
	if (info){
		var result = {success: true};
		var v = $.parseJSON(info);
		var resst = v.responseStatus.responseValue;
		if (resst == 'ok'){
			if(AnyBalance.isAvailable('balance')){
				result['balance'] = v.services[0].saldo;
			}
			if(AnyBalance.isAvailable('traffic')){
				result['traffic'] = (v.traffic[0].rows[2].underTraffic / 1000000000).toFixed(1);
			}
			AnyBalance.setResult(result);
		} else if (resst == 'bad login'){
			throw new AnyBalance.Error('Неправильный логин или пароль');
		}
	} else {
		throw new AnyBalance.Error('Неизвестная ошибка');
	}
}