/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

World of Tanks — бесплатная онлайн игра
Сайт игры: http://worldoftanks.ru/
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.nick, 'Enter nick or ID!');
	
	// Проверяем правильность id
	if (prefs.method == 'id'){
		var regexp = /\d+$/;
		if (!(regexp.test(prefs.nick)))
			throw new AnyBalance.Error('ID must contain only digits!');
	}
	
	if (!prefs.region || prefs.region == 'RU'){
		var API_ADDR = 'http://api.worldoftanks.ru';
	} else if (prefs.region == 'EU'){
		var API_ADDR = 'http://api.worldoftanks.eu';
	} else if (prefs.region == 'NA'){
		var API_ADDR = 'http://api.worldoftanks.com';
	} else if (prefs.region == 'ASIA'){
		var API_ADDR = 'http://api.worldoftanks.asia';
	} else if (prefs.region == 'KR'){
		var API_ADDR = 'http://api.worldoftanks.kr';
	}
	
	// Получаем ID игрока
	var id = (prefs.method == 'id') ? prefs.nick : getID (prefs.nick, API_ADDR);

	// Получаем информацию игрока
	var info = getData(API_ADDR + '/wot/account/info/?application_id=' + prefs.appid + '&account_id=' + id + '&fields=private,nickname&access_token=' + prefs.token);
	
	if(!(info.data[id]['private']))
		throw new AnyBalance.Error('Token is expired!');
	if(info.status == 'error')
		throw new AnyBalance.Error(info.error.mesage);
	
	var result = {success: true};
	
	result.__tariff = info.data[id].nickname;
	
	if(AnyBalance.isAvailable('gold'))
		result['gold'] = info.data[id]['private'].gold;
		
	if(AnyBalance.isAvailable('credits'))
		result['credits'] = info.data[id]['private'].credits;
		
	if(AnyBalance.isAvailable('free_xp'))
		result['free_xp'] = info.data[id]['private'].free_xp;
	
	if(AnyBalance.isAvailable('premium'))
		if(info.data[id]['private'].is_premium) {
			var t = new Date(info.data[id]['private'].premium_expires_at * 1000);
			result['premium'] = getDateTimeToString(t, "dddd, dd.MM.yyyy (hh:mm)");; 
		} else {
			result['premium'] = "Premium not found";
		}
		
	AnyBalance.setResult(result);
}