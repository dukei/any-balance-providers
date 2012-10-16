/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Высокоскоростной интернет и цифровое телевидение Воля
Сайт оператора: http://volia.com
Личный кабинет: https://stat.volia.com:8443/ktvinet/main.do
*/

function findGoodService(services){
    for(var i=0; services && i<services.length; ++i){
        if(!services[i].finishDate)
            return services[i];
        var matches = /\w+\s+(\w+)\s+(\d+).*(\d{4})/i.exec(services[i].finishDate);
        if(matches){
             var dt = Date.parse(matches[1] + ' ' + matches[2] + ', ' + matches[3]);
             AnyBalance.trace("Parsed date " + new Date(dt) + " from " + services[i].finishDate);
             if(dt > new Date().getTime())
                 return services[i];
        }
    }
    return null;
}

function main(){
	var prefs = AnyBalance.getPreferences();
	var pass = prefs.pass;
	var login = prefs.login;
	var info = AnyBalance.requestGet('https://stat.volia.com:8443/ktvinet/vapi/jstat.jsp?code=' + login + '&pass=' + pass);
	if (info){
		var result = {success: true};
		var v = JSON.parse(info);
		var resst = v.responseStatus.responseValue;
		if (resst == 'ok'){
			result.__tariff = v.abonent.fullname;
                        if(AnyBalance.isAvailable('fio'))
                            result.fio = v.abonent.fullname;
                        var service = findGoodService(v.services);
                        if(service && service.model)
                            result.__tariff = (service.name ? service.name + ': ' + service.model : service.model);
			if(AnyBalance.isAvailable('balance') && v.services[0]){
				result['balance'] = v.services[0].saldo;
			}
			if(AnyBalance.isAvailable('traffic') && v.traffic && v.traffic[0] && v.traffic[0].rows && v.traffic[0].rows[2] && v.traffic[0].rows[2].underTraffic){
				result['traffic'] = (v.traffic[0].rows[2].underTraffic / 1000000000).toFixed(1);
			}
			AnyBalance.setResult(result);
		} else if (resst == 'bad login'){
			throw new AnyBalance.Error('Неправильный логин или пароль');
		} else {
			throw new AnyBalance.Error('Неизвестный ответ сервера: ' + resst);
		}
	} else {
		throw new AnyBalance.Error('Неизвестная ошибка');
	}
}