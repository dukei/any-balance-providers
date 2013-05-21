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
	if ((AnyBalance.isAvailable('tank_wins', 'tank_battles', 'tank_win_percent', 'er', 'wn6', 'er_armor', 'er_xvm', 'wn6_xvm'))||(prefs.listPref == 'id'))
		var id = (prefs.listPref == 'id') ? prefs.nick : getID (prefs.nick);
		
	// Если есть ник и не нужны данные, которые можно получить по id (только общая статистика)
	if ((!(AnyBalance.isAvailable('tank_wins', 'tank_battles', 'tank_win_percent', 'er', 'wn6', 'er_armor', 'er_xvm', 'wn6_xvm')))&&(prefs.listPref == 'nick')) {
		var pd = getData('http://worldoftanks.ru/uc/accounts/api/1.1/?source_token=WG-WoT_Assistant-1.1.2&search=' + prefs.nick + '&offset=0&limit=1');
		var result = {success: true};
		
		var pname = pd.data.items[0].clan ? pd.data.items[0].name + '[' + pd.data.items[0].clan.tag + ']' : pd.data.items[0].name;
		
		result.__tariff = pname;
		
		if(AnyBalance.isAvailable('name'))
			result['name'] = pname;
			
		if(AnyBalance.isAvailable('wins'))
			result['wins'] = pd.data.items[0].stats.wins;
			
		if(AnyBalance.isAvailable('battles'))
			result['battles'] = pd.data.items[0].stats.battles;
			
		if(AnyBalance.isAvailable('win_percent', 'next_perc', 'next_perc_05'))
			var win_percent = pd.data.items[0].stats.wins / pd.data.items[0].stats.battles * 100
			
			if(AnyBalance.isAvailable('win_percent'))
				result['win_percent'] = win_percent.toFixed(1);
				
			if(AnyBalance.isAvailable('next_perc'))
				var np = Math.floor(win_percent) + 1;
				result['next_perc'] = Math.floor((np * pd.data.items[0].stats.battles - 100 * pd.data.items[0].stats.wins) / (100 - np) + 1);
				
			if(AnyBalance.isAvailable('next_perc_05'))
				var np = Math.floor(win_percent + 0.5) + 0.5;
				result['next_perc_05'] = Math.floor((np * pd.data.items[0].stats.battles - 100 * pd.data.items[0].stats.wins) / (100 - np) + 1);
		
		AnyBalance.setResult(result);

	// Если есть id или нужны данные, которые можно получить по id (статистика по танкам)
	} else {
		var pd = getData('http://worldoftanks.ru/community/accounts/' + id + '/api/1.9/?source_token=WG-WoT_Assistant-test');
		var result = {success: true};
		
		var pname = pd.data.clan.clan ? pd.data.name + '[' + pd.data.clan.clan.abbreviation + ']' : pd.data.name;
		
		// Общая статистика
		if(AnyBalance.isAvailable('name'))
			result['name'] = pname;
		
		if(AnyBalance.isAvailable('wins'))
			result['wins'] = pd.data.summary.wins;
			
		if(AnyBalance.isAvailable('battles'))
			result['battles'] = pd.data.summary.battles_count;
			
		if(AnyBalance.isAvailable('win_percent', 'next_perc', 'next_perc_05'))
			var win_percent = pd.data.summary.wins / pd.data.summary.battles_count * 100
			
			if(AnyBalance.isAvailable('win_percent'))
				result['win_percent'] = win_percent.toFixed(1);
				
			if(AnyBalance.isAvailable('next_perc'))
				var np = Math.floor(win_percent) + 1;
				result['next_perc'] = Math.floor((np * pd.data.summary.battles_count - 100 * pd.data.summary.wins) / (100 - np) + 1);
				
			if(AnyBalance.isAvailable('next_perc_05'))
				var np = Math.floor(win_percent + 0.5) + 0.5;
				result['next_perc_05'] = Math.floor((np * pd.data.summary.battles_count - 100 * pd.data.summary.wins) / (100 - np) + 1);
				
			
		if(AnyBalance.isAvailable('er', 'er_armor', 'wn6', 'er_xvm', 'wn6_xvm'))
			var battles = pd.data.ratings.battles.value;
			
			var DAMAGE = pd.data.ratings.damage_dealt.value / battles;
			var FRAGS = pd.data.ratings.frags.value / battles;
			var SPOT = pd.data.ratings.spotted.value / battles;
			var CAP = pd.data.ratings.ctf_points.value / battles;
			var DEF = pd.data.ratings.dropped_ctf_points.value / battles;
			
		if(AnyBalance.isAvailable('er', 'er_armor', 'er_xvm'))
			var CAP = pd.data.ratings.ctf_points.value / battles;

		if(AnyBalance.isAvailable('er', 'wn6', 'er_xvm', 'wn6_xvm'))
			var tmp = pd.data.vehicles;
			var s = 0;
			for (q in tmp){
				t = tmp[q];
				s += t.battle_count * t.level;
			}
			var TIER = s / battles;
			
		if(AnyBalance.isAvailable('wn6', 'er_armor', 'wn6_xvm'))
			var WINRATE = pd.data.ratings.battle_wins.value / battles; // not percent
			
		if(AnyBalance.isAvailable('er', 'er_xvm'))
			// result['er'] = (DAMAGE * (10 / TIER) * (0.15 + 2 * TIER / 100) + FRAGS * (0.35 - 2 * TIER / 100) * 1000 + SPOT * 0.2 * 1000 + CAP * 0.15 * 1000 + DEF * 0.15 * 1000).toFixed(0); - старая формула
			
			var er = DAMAGE * (10 / (TIER + 2)) * (0.23 + 2 * TIER / 100) + FRAGS * 250 + SPOT * 150 + Math.log(CAP + 1) / Math.log(1.732) * 150 + DEF * 150
			
			if(AnyBalance.isAvailable('er'))
				result['er'] = er.toFixed(0);
			
			if(AnyBalance.isAvailable('er_xvm'))
				result['er_xvm'] = (Math.max(Math.min(4.787e-17 * Math.pow(er,6) - 3.5544e-13 * Math.pow(er,5) + 1.02606e-9 * Math.pow(er,4) - 1.4665e-6 * Math.pow(er,3) + 1.0827e-3 * Math.pow(er,2) - 0.3133 * er + 20.49, 100), 0)).toFixed(1);

		if(AnyBalance.isAvailable('er_armor'))
			var avg_exp = pd.data.ratings.battle_avg_xp.value;
			
			// http://armor.kiev.ua/wot/rating/
			result['er_armor'] = (Math.log(battles) / 10 * (avg_exp + DAMAGE * (WINRATE * 2 + FRAGS * 0.9 + (SPOT + CAP + DEF) * 0.5))).toFixed(0);4
			
		if(AnyBalance.isAvailable('wn6', 'wn6_xvm'))
		
			var wn6 = (1240 - 1040 / Math.pow((Math.min(TIER, 6)), 0.164)) * FRAGS + DAMAGE * 530 / (184 * Math.exp(0.24 * TIER) + 130) + SPOT * 125 + Math.min(DEF, 2.2) * 100 + ((185 / (0.17 + Math.exp((WINRATE * 100 - 35) * -0.134))) - 500) * 0.45 + (6 - Math.min(TIER, 6)) * -60
			
			if(AnyBalance.isAvailable('wn6'))
				result['wn6'] = wn6.toFixed(0);
			
			if(AnyBalance.isAvailable('wn6_xvm'))
				result['wn6_xvm'] = (Math.max(Math.min(-1.334e-11 * Math.pow(wn6,4) + 5.673e-8 * Math.pow(wn6,3) - 7.575e-5 * Math.pow(wn6,2) + 0.08392 * wn6 - 9.362, 100), 0)).toFixed(1);
			
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