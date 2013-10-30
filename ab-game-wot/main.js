/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
	'X-Requested-With': 'XMLHttpRequest',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.nick, 'Введите ник или id');
	prefs.accuracy = prefs.accuracy || 1;
	
	// Независимо от того, что ввел юзер, ник или ID нам надо получать ID. функция getID вернет id не зависимо от того что в нее предали
	var id = getID(prefs.nick);

	var result = {success: true};

	var html = AnyBalance.requestGet('http://worldoftanks.ru/community/accounts/' + id, g_headers);
	var clan = AnyBalance.requestGet('http://worldoftanks.ru/community/clans/show_clan_block/?spa_id=' + id, g_headers);
	var clanJS = getJson(clan);

	var name = getParam(html, null, null, /"js-profile-name"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	var clanName = getParam(clanJS.data.clan_block, null, null, /<span class="tag"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		
	getParam(clanName ? name + ' ' +clanName : name, result, 'name');

	var wins = getParam(html, null, null, /"td-minor"[^>]*>\s*Побед(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	var battles = getParam(html, null, null, /"td-minor"[^>]*>\s*Проведено боёв(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);

	getParam(wins, result, 'wins');
	getParam(battles, result, 'battles');

	if (isAvailable(['win_percent', 'next_perc', 'next_perc_05'])) {
		var win_percent = (wins / battles) * 100;
		getParam(win_percent.toFixed(prefs.accuracy), result, 'win_percent');

		if (AnyBalance.isAvailable('next_perc')) {
			var np = Math.floor(win_percent) + 1;
			result['next_perc'] = Math.floor((np * battles - 100 * wins) / (100 - np) + 1);
		}
		if (AnyBalance.isAvailable('next_perc_05')) var np = Math.floor(win_percent + 0.5) + 0.5;
		result['next_perc_05'] = Math.floor((np * battles - 100 * wins) / (100 - np) + 1);
	}


	if (prefs.tank) {
		var tanks = sumParam(html, null, null, /(<span\s+class="b-name-vehicle"[^>]*>(?:[\s\S]*?<\/td>){4})/ig);
		for (i = 0; i < tanks.length; i++) {
			var tank = tanks[i];

			if (getParam(tank, null, null, /"b-gray-link[^>]*>([^<]*)/i, replaceTagsAndSpaces) == prefs.tank) {
				// Бои
				var battles = getParam(tank, null, null, /"t-profile_right"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
				// Процент побед
				var battlespcts = getParam(tank, null, null, /"t-profile_center"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
				getParam(battles, result, 'tank_battles');
				getParam(battlespcts, result, 'tank_win_percent');
				getParam((battles / 100 * battlespcts).toFixed(prefs.accuracy), result, 'tank_wins');
				break;
			}
		}
	}
	/*if(AnyBalance.isAvailable('er', 'er_armor', 'wn6', 'er_xvm', 'wn6_xvm')) {
			var DAMAGE = getParam(html, null, null, /"td-minor"[^>]*>\s*Нанесённые\s+повреждения(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance) / battles;
			var FRAGS = getParam(html, null, null, /"td-minor"[^>]*>\s*Уничтожено(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance) / battles;


			
			var SPOT = getParam(html, null, null, /"td-minor"[^>]*>\s*Обнаружено(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance) / battles;
			var CAP = pd.data.ratings.ctf_points.value / battles;
			var DEF = getParam(html, null, null, /"td-minor"[^>]*>\s*Обнаружено(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance) / battles;

			
			
			
			
		}
		/*var pname = pd.data.clan.clan ? pd.data.name + '[' + pd.data.clan.clan.abbreviation + ']' : pd.data.name;
		
		// Общая статистика

				
			
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
				// http://www.koreanrandom.com/forum/topic/2625-xvm-%D1%88%D0%BA%D0%B0%D0%BB%D0%B0-scale/page-48
				if(er<420) {
					result['er_xvm'] = 0
				} else {
					result['er_xvm'] = (Math.max(Math.min(er*(er*(er*(er*(er*(4.5254e-17*er - 3.3131e-13) + 9.4164e-10) - 1.3227e-6) + 9.5664e-4) - 0.2598) + 13.23, 100), 0)).toFixed(prefs.accuracy);
				}

		if(AnyBalance.isAvailable('er_armor'))
			var avg_exp = pd.data.ratings.battle_avg_xp.value;
			
			// http://armor.kiev.ua/wot/rating/
			result['er_armor'] = (Math.log(battles) / 10 * (avg_exp + DAMAGE * (WINRATE * 2 + FRAGS * 0.9 + (SPOT + CAP + DEF) * 0.5))).toFixed(0);
			
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
						result['tank_win_percent'] = (t.win_count / t.battle_count * 100).toFixed(prefs.accuracy);
					}
					f = 1;
					break;
				}
			}
			if (f == 0)
				throw new AnyBalance.Error('Танк не найден');
		} else {
			result.__tariff = pname;
		}*/
	AnyBalance.setResult(result);
}


function getData(url) {
	var data = AnyBalance.requestGet(url, g_headers);
	if (data) {
		var code = data.match(/<title>(.+?)<\/title>/i);
		if (code) {
			throw new AnyBalance.Error(code[1]);
		} else {
			var js = getJson(data);
			var st = js.result
			if (st == 'ok' || st == 'success') {
				return js;
			} else if (st == 'error') {
				var err = js.error
				throw new AnyBalance.Error('Ошибка: ' + err);
			} else {
				throw new AnyBalance.Error('Неизвестный ответ сервера: ' + st);
			}
		}
	} else {
		throw new AnyBalance.Error('Неизвестная ошибка');
	}
}

function getID(nick) {
	if(/^\d+$/.test(nick))
		return nick;
		
	var v = getData('http://worldoftanks.ru/community/accounts/search/?_=1382974324537&offset=0&limit=1&order_by=name&search=' + nick + '&echo=2&id=accounts_index');
	return v.request_data.items[0].id;
}