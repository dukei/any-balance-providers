/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

World of Tanks — бесплатная онлайн игра
Сайт игры: http://worldoftanks.ru/
**/

function main(){
	var prefs = AnyBalance.getPreferences();
	var nick = prefs.nick;
	var info = AnyBalance.requestGet('http://worldoftanks.ru/uc/accounts/api/1.0/?source_token=WG-WoT_Assistant-1.1.2&search=' + nick + '&offset=0&limit=1');
	if (info){
		var result = {success: true};
		var v = $.parseJSON(info);
		var st =  v.status
		if (st == 'ok'){
			if(AnyBalance.isAvailable('name')){
				result['name'] = v.data.items[0].name;
			}
			if(AnyBalance.isAvailable('clan')){
				result['clan'] = v.data.items[0].clan;
			}
			if(AnyBalance.isAvailable('wins')){
				result['wins'] = v.data.items[0].stats.wins;
			}
			if(AnyBalance.isAvailable('battles')){
				result['battles'] = v.data.items[0].stats.battles;
			}
			if(AnyBalance.isAvailable('win_percent')){
				result['win_percent'] = (v.data.items[0].stats.wins / v.data.items[0].stats.battles).toFixed(3) * 100;
			}
			AnyBalance.setResult(result);
		} else if (st == 'error'){
			var err = v.error
			throw new AnyBalance.Error('Ошибка: ' + err);
		} else {
			throw new AnyBalance.Error('Неизвестный ответ сервера: ' + st);
		}
	} else {
		throw new AnyBalance.Error('Неизвестная ошибка');
	}
}