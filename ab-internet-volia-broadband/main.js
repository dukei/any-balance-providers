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
		var tariff_type = prefs.tariff_type || '3';
		if (resst == 'ok'){
			result.__tariff = v.abonent.fullname;
                        if(AnyBalance.isAvailable('fio'))
                            result.fio = v.abonent.fullname;
                        var service = findGoodService(v.services);
                        //if(service && service.model) //Старое отображение тарифа
                        //    result.__tariff = ((service.name && service.code != 'inet') ? service.name + ': ' + service.model : service.model);
			if(v.services[tariff_type])
                            result.__tariff = v.services[tariff_type].name + ': ' + v.services[tariff_type].model;
			//Баланс
			if(AnyBalance.isAvailable('balance') && v.services[0]){
                                AnyBalance.trace('balance is ' + v.services[0].saldo + ', ' + typeof(v.services[0].saldo));
				result['balance'] = v.services[0].saldo;
			}
			//Общий трафик
			if(AnyBalance.isAvailable('traffic') && v.traffic && v.traffic[0] && v.traffic[0].rows && v.traffic[0].rows[2] && v.traffic[0].rows[2].traffic){
				result['traffic'] = (v.traffic[0].rows[2].traffic / 1000000000).toFixed(1);
			}
			if(AnyBalance.isAvailable('traffic_in_lim') && v.traffic && v.traffic[0] && v.traffic[0].rows && v.traffic[0].rows[2] && v.traffic[0].rows[2].underTraffic){
				result['traffic_in_lim'] = (v.traffic[0].rows[2].underTraffic / 1000000000).toFixed(1);
			}
			if(AnyBalance.isAvailable('traffic_over_lim') && v.traffic && v.traffic[0] && v.traffic[0].rows && v.traffic[0].rows[2] && v.traffic[0].rows[2].overTraffic){
				result['traffic_over_lim'] = (v.traffic[0].rows[2].overTraffic / 1000000000).toFixed(1);
			}
			//Трафик внешний зарубежный
			if(AnyBalance.isAvailable('traffic_SatEx') && v.traffic && v.traffic[0] && v.traffic[0].rows && v.traffic[0].rows[1] && v.traffic[0].rows[1].traffic){
				result['traffic_SatEx'] = (v.traffic[0].rows[1].traffic / 1000000000).toFixed(1);
			}
			if(AnyBalance.isAvailable('traffic_in_lim_SatEx') && v.traffic && v.traffic[0] && v.traffic[0].rows && v.traffic[0].rows[1] && v.traffic[0].rows[1].underTraffic){
				result['traffic_in_lim_SatEx'] = (v.traffic[0].rows[1].underTraffic / 1000000000).toFixed(1);
			}
			if(AnyBalance.isAvailable('traffic_over_lim_SatEx') && v.traffic && v.traffic[0] && v.traffic[0].rows && v.traffic[0].rows[1] && v.traffic[0].rows[1].overTraffic){
				result['traffic_over_lim_SatEx'] = (v.traffic[0].rows[1].overTraffic / 1000000000).toFixed(1);
			}
			//Трафик внутренний украинский
			if(AnyBalance.isAvailable('traffic_UkrEx') && v.traffic && v.traffic[0] && v.traffic[0].rows && v.traffic[0].rows[0] && v.traffic[0].rows[0].traffic){
				result['traffic_UkrEx'] = (v.traffic[0].rows[0].traffic / 1000000000).toFixed(1);
			}
			if(AnyBalance.isAvailable('traffic_in_lim_UkrEx') && v.traffic && v.traffic[0] && v.traffic[0].rows && v.traffic[0].rows[0] && v.traffic[0].rows[0].underTraffic){
				result['traffic_in_lim_UkrEx'] = (v.traffic[0].rows[0].underTraffic / 1000000000).toFixed(1);
			}
			if(AnyBalance.isAvailable('traffic_over_lim_UkrEx') && v.traffic && v.traffic[0] && v.traffic[0].rows && v.traffic[0].rows[0] && v.traffic[0].rows[0].overTraffic){
				result['traffic_over_lim_UkrEx'] = (v.traffic[0].rows[0].overTraffic / 1000000000).toFixed(1);
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