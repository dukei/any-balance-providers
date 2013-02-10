/*
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

World of Tanks — бесплатная онлайн игра
Сайт игры: http://worldoftanks.ru/
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.nick, 'Введите ник или id');
	// Проверяем правильность id
	if (prefs.listPref == 'id'){
		var regexp = /\d+$/;
		if (!(regexp.test(prefs.nick)))
			throw new AnyBalance.Error('ID должен состоять только из цифр');
	}
	
	// Проверяем нужен ли нам id, при необходимости получаем его
	if ((AnyBalance.isAvailable('tank_wins', 'tank_battles', 'tank_win_percent'))||(prefs.listPref == 'id'))
		var id = (prefs.listPref == 'id') ? prefs.nick : getID (prefs.nick);
		
	// Если есть ник и не нужны данные, которые можно получить по id (только общая статистика)
	if ((!(AnyBalance.isAvailable('tank_wins', 'tank_battles', 'tank_win_percent')))&&(prefs.listPref == 'nick')) {
		var pd = getData('http://worldoftanks.ru/uc/accounts/api/1.0/?source_token=WG-WoT_Assistant-1.1.2&search=' + prefs.nick + '&offset=0&limit=1');
		var result = {success: true};
		
		var pname = pd.data.items[0].clan ? pd.data.items[0].name + '[' + pd.data.items[0].clan.tag + ']' : pd.data.items[0].name;
		
		result.__tariff = pname;
		
		if(AnyBalance.isAvailable('name'))
			result['name'] = pname;
			
		if(AnyBalance.isAvailable('wins'))
			result['wins'] = pd.data.items[0].stats.wins;
			
		if(AnyBalance.isAvailable('battles'))
			result['battles'] = pd.data.items[0].stats.battles;
			
		if(AnyBalance.isAvailable('win_percent'))
			result['win_percent'] = (pd.data.items[0].stats.wins / pd.data.items[0].stats.battles * 100).toFixed(1);
		
		AnyBalance.setResult(result);

	// Если есть id или нужны данные, которые можно получить по id (статистика по танкам)
	} else {
		var pd = getData('http://worldoftanks.ru/community/accounts/' + id + '/api/1.2/?source_token=WG-WoT_Assistant-test');
		var result = {success: true};
		
		var pname = pd.data.clan.clan ? pd.data.name + '[' + pd.data.clan.clan.abbreviation + ']' : pd.data.name;
		
		// Общая статистика
		if(AnyBalance.isAvailable('name'))
			result['name'] = pname;
		
		if(AnyBalance.isAvailable('wins'))
			result['wins'] = pd.data.summary.wins;
			
		if(AnyBalance.isAvailable('battles'))
			result['battles'] = pd.data.summary.battles_count;
			
		if(AnyBalance.isAvailable('win_percent'))
			result['win_percent'] = (pd.data.summary.wins / pd.data.summary.battles_count * 100).toFixed(1);
			
		if(AnyBalance.isAvailable('er', 'er_armor'))
			var battles = pd.data.ratings.battles.value;
			
			var dmg = pd.data.ratings.damage_dealt.value / battles;
			var des = pd.data.ratings.frags.value / battles;
			var det = pd.data.ratings.spotted.value / battles;
			var cap = pd.data.ratings.ctf_points.value / battles;
			var dff = pd.data.ratings.dropped_ctf_points.value / battles;
			
		if(AnyBalance.isAvailable('er'))
			var tmp = pd.data.vehicles;
			var s = 0;
			for (q in tmp){
				t = tmp[q];
				s += t.battle_count * t.level;
			}
			var fmid = s / battles;

			// result['er'] = (dmg * (10 / fmid) * (0.15 + 2 * fmid / 100) + des * (0.35 - 2 * fmid / 100) * 1000 + det * 0.2 * 1000 + cap * 0.15 * 1000 + dff * 0.15 * 1000).toFixed(0);
			
			result['er'] = (dmg * (10 / (fmid + 2)) * (0.23 + 2 * fmid / 100) + des * 250 + det * 150 + Math.log(cap + 1) / Math.log(1.732) * 150 + dff * 150).toFixed(0);

		if(AnyBalance.isAvailable('er_armor'))
			var avg_exp = pd.data.ratings.battle_avg_xp.value;
			var avg_perf = pd.data.ratings.battle_wins.value / battles;
			
			// http://armor.kiev.ua/wot/rating/
			result['er_armor'] = (Math.log(battles) / 10 * (avg_exp + dmg * (avg_perf * 2 + des * 0.9 + (det + cap + dff) * 0.5))).toFixed(0);
			
		if (prefs.tank) {
			var tmp = pd.data.vehicles;
			var f = 0;
			for (q in tmp){
				t = tmp[q]
				if (t.localized_name == prefs.tank || t.name == prefs.tank) {
					
					result.__tariff = pname + ' (' + t.localized_name + ')';
					
					// Статистика танка
					if(AnyBalance.isAvailable('tank_wins')){
						result['tank_wins'] = t.win_count;
					}
					if(AnyBalance.isAvailable('tank_battles')){
						result['tank_battles'] = t.battle_count;
					}
					if(AnyBalance.isAvailable('tank_win_percent')){
						result['tank_win_percent'] = (t.win_count / t.battle_count * 100).toFixed(1);
					}
					f = 1;
					break;
				}
			}
			if (f == 0)
				throw new AnyBalance.Error('Танк не найден');
		} else {
			result.__tariff = pname;
		}
		AnyBalance.setResult(result);
	}
}