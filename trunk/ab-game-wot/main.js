/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

World of Tanks — бесплатная онлайн игра
Сайт игры: http://worldoftanks.ru/
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.nick, 'Enter nick or ID!');
	
	// Проверяем правильность id
	if (prefs.listPref == 'id'){
		var regexp = /\d+$/;
		if (!(regexp.test(prefs.nick)))
			throw new AnyBalance.Error('ID must contain only digits!');
	}
	
	if (!prefs.region || prefs.region == 'RU'){
		// Заглушка
		var API_ADDR = 'http://api.worldoftanks.ru';
		var APP_ID = '171745d21f7f98fd8878771da1000a31';
	} else if (prefs.region == 'EU'){
		var API_ADDR = 'http://api.worldoftanks.eu';
		var APP_ID = 'd0a293dc77667c9328783d489c8cef73';
	} else if (prefs.region == 'NA'){
		var API_ADDR = 'http://api.worldoftanks.com';
		var APP_ID = '16924c431c705523aae25b6f638c54dd';
	} else if (prefs.region == 'ASIA'){
		var API_ADDR = 'http://api.worldoftanks.asia';
		var APP_ID = '39b4939f5f2460b3285bfa708e4b252c';
	} else if (prefs.region == 'KR'){
		var API_ADDR = 'http://api.worldoftanks.kr';
		var APP_ID = 'ffea0f1c3c5f770db09357d94fe6abfb';
	}
	
	// Получаем ID игрока
	var id = (prefs.listPref == 'id') ? prefs.nick : getID (prefs.nick, API_ADDR, APP_ID);

	// Получаем список танков
	var tdata = getData(API_ADDR + '/2.0/encyclopedia/tanks/?application_id=' + APP_ID + '&fields=level,name_i18n,name');
	var tanks_data = tdata.data;
	
	// Получаем информацию по ироку
	// Player info
	var pinfo = getData(API_ADDR + '/2.0/account/info/?application_id=' + APP_ID + '&account_id=' + id + '&limit=1');
	// Player vehicles
	if(AnyBalance.isAvailable('er', 'wn6', 'er_xvm', 'wn6_xvm', 'tank_wins', 'tank_battles', 'tank_win_percent'))
		var pvehicles = getData(API_ADDR + '/2.0/account/tanks/?application_id=' + APP_ID + '&account_id=' + id + '&fields=statistics,tank_id');
	// Player stats slice (на будущее)
	// var pstatsslice = getData(API_ADDR + '/2.0/stats/accountbytime/?application_id=' + APP_ID + '&account_id=' + id + '&hours_ago=24');
	// Get clan name
	if (pinfo.data[id].clan) {
		var cinfo = getData(API_ADDR + '/2.0/clan/info//?application_id=' + APP_ID + '&clan_id=' + pinfo.data[id].clan.clan_id + '&fields=abbreviation');
		var cname = cinfo.data[pinfo.data[id].clan.clan_id].abbreviation;
	}
	
	var result = {success: true};
	
	var pname = pinfo.data[id].clan ? pinfo.data[id].nickname + '[' + cname + ']' : pinfo.data[id].nickname;
	
	// Общая статистика
	if(AnyBalance.isAvailable('name'))
		result['name'] = pname;
	
	if(AnyBalance.isAvailable('wins'))
		result['wins'] = pinfo.data[id].statistics.all.wins;
		
	if(AnyBalance.isAvailable('battles'))
		result['battles'] = pinfo.data[id].statistics.all.battles;
		
	if(AnyBalance.isAvailable('win_percent', 'next_perc', 'next_perc_05'))
		var win_percent = pinfo.data[id].statistics.all.wins / pinfo.data[id].statistics.all.battles * 100
		
		if(AnyBalance.isAvailable('win_percent'))
			result['win_percent'] = win_percent.toFixed(prefs.accuracy);
			
		if(AnyBalance.isAvailable('next_perc'))
			var np = Math.floor(win_percent) + 1;
			result['next_perc'] = Math.floor((np * pinfo.data[id].statistics.all.battles - 100 * pinfo.data[id].statistics.all.wins) / (100 - np) + 1);
			
		if(AnyBalance.isAvailable('next_perc_05'))
			var np = Math.floor(win_percent + 0.5) + 0.5;
			result['next_perc_05'] = Math.floor((np * pinfo.data[id].statistics.all.battles - 100 * pinfo.data[id].statistics.all.wins) / (100 - np) + 1);
			
	if(AnyBalance.isAvailable('er', 'er_armor', 'wn6', 'er_xvm', 'wn6_xvm'))
		var battles = pinfo.data[id].statistics.all.battles;
		
		var DAMAGE = pinfo.data[id].statistics.all.damage_dealt / battles;
		var FRAGS = pinfo.data[id].statistics.all.frags / battles;
		var SPOT = pinfo.data[id].statistics.all.spotted / battles;
		var CAP = pinfo.data[id].statistics.all.capture_points / battles;
		var DEF = pinfo.data[id].statistics.all.dropped_capture_points / battles;
		
	if(AnyBalance.isAvailable('er', 'er_armor', 'er_xvm'))
		var CAP = pinfo.data[id].statistics.all.capture_points / battles;

	if(AnyBalance.isAvailable('er', 'wn6', 'er_xvm', 'wn6_xvm'))
		var tmp = pvehicles.data[id]
		var s = 0;
		for (q in tmp){
			s += tmp[q].statistics.all.battles * tanks_data[tmp[q].tank_id].level;
		}	
		var TIER = s / battles;
		
	if(AnyBalance.isAvailable('wn6', 'er_armor', 'wn6_xvm'))
		var WINRATE = pinfo.data[id].statistics.all.wins / battles; // not percent
		
	if(AnyBalance.isAvailable('er', 'er_xvm'))
		// result['er'] = (DAMAGE * (10 / TIER) * (0.15 + 2 * TIER / 100) + FRAGS * (0.35 - 2 * TIER / 100) * 1000 + SPOT * 0.2 * 1000 + CAP * 0.15 * 1000 + DEF * 0.15 * 1000).toFixed(0); - старая формула
		
		var er = DAMAGE * (10 / (TIER + 2)) * (0.23 + 2 * TIER / 100) + FRAGS * 250 + SPOT * 150 + Math.log(CAP + 1) / Math.log(1.732) * 150 + DEF * 150
		
		if(AnyBalance.isAvailable('er'))
			result['er'] = er.toFixed(0);
		
		if(AnyBalance.isAvailable('er_xvm'))
			// http://www.koreanrandom.com/forum/topic/2625-xvm-%D1%88%D0%BA%D0%B0%D0%BB%D0%B0-scale/page-48
			if(er<420) {
				result['er_xvm'] = 0
			} else {
				result['er_xvm'] = (Math.max(Math.min(er*(er*(er*(er*(er*(4.5254e-17*er - 3.3131e-13) + 9.4164e-10) - 1.3227e-6) + 9.5664e-4) - 0.2598) + 13.23, 100), 0)).toFixed(prefs.accuracy);
			}

	if(AnyBalance.isAvailable('avg_exp'))
		result['avg_exp'] = pinfo.data[id].statistics.all.battle_avg_xp;
			
	if(AnyBalance.isAvailable('er_armor'))
		try {
			var stat = pinfo.data[id].statistics;
			
			var BATTLES_RND = stat_rnd('battles', stat);
			var DAMAGE_RND = stat_rnd('damage_dealt', stat) / BATTLES_RND;
			var AVG_EXP_RND = stat_rnd('xp', stat) / BATTLES_RND;
			var WINS_RND = stat_rnd('wins', stat) / BATTLES_RND;
			var FRAGS_RND = stat_rnd('frags', stat) / BATTLES_RND;
			var SPOT_RND = stat_rnd('spotted', stat) / BATTLES_RND;
			var CAP_RND = stat_rnd('capture_points', stat) / BATTLES_RND;
			var DEF_RND = stat_rnd('dropped_capture_points', stat) / BATTLES_RND;
			
			result['er_armor'] = (Math.log(BATTLES_RND) / 10 * (AVG_EXP_RND + DAMAGE_RND * (WINS_RND * 2 + FRAGS_RND * 0.9 + (SPOT_RND + CAP_RND + DEF_RND) * 0.5))).toFixed(prefs.accuracy);		
		} catch (e) {
		}
	if(AnyBalance.isAvailable('wn6', 'wn6_xvm'))
	
		var wn6 = (1240 - 1040 / Math.pow((Math.min(TIER, 6)), 0.164)) * FRAGS + DAMAGE * 530 / (184 * Math.exp(0.24 * TIER) + 130) + SPOT * 125 + Math.min(DEF, 2.2) * 100 + ((185 / (0.17 + Math.exp((WINRATE * 100 - 35) * -0.134))) - 500) * 0.45 + (6 - Math.min(TIER, 6)) * -60
		
		if(AnyBalance.isAvailable('wn6'))
			result['wn6'] = wn6.toFixed(0);
		
		if(AnyBalance.isAvailable('wn6_xvm'))
			// http://www.koreanrandom.com/forum/topic/2625-xvm-%D1%88%D0%BA%D0%B0%D0%BB%D0%B0-scale/page-48
			if(wn6>2160) {
				result['wn6_xvm'] = 100
			} else {
				result['wn6_xvm'] = (Math.max(Math.min(wn6*(wn6*(wn6*(-1.268e-11*wn6 + 5.147e-8) - 6.418e-5) + 7.576e-2) - 7.25, 100), 0)).toFixed(prefs.accuracy);
			}
		
	if (prefs.tank) {
		var tmp = pvehicles.data[id]
		var f = 0;
		for (q in tmp){

			if (tanks_data[tmp[q].tank_id].name_i18n == prefs.tank || tanks_data[tmp[q].tank_id].name.split(':', 2)[1] == prefs.tank) {
				
				result.__tariff = pname + ' (' + tanks_data[tmp[q].tank_id].name_i18n + ')';

				// Статистика танка
				if(AnyBalance.isAvailable('tank_wins')){
					result['tank_wins'] = tmp[q].statistics.wins;
				}
				if(AnyBalance.isAvailable('tank_battles')){
					result['tank_battles'] = tmp[q].statistics.battles;
				}
				if(AnyBalance.isAvailable('tank_win_percent')){
					result['tank_win_percent'] = (tmp[q].statistics.wins / tmp[q].statistics.battles * 100).toFixed(prefs.accuracy);
				}
				f = 1;
				break;
				}
		}
		if (f == 0)
			throw new AnyBalance.Error('Tank not found');
	} else {
		result.__tariff = pname;
	}
	AnyBalance.setResult(result);
}