/*
Провайдер Chess.com (http://chess.com)

Chess.com — Шахматный интернет-клуб
Сайт игры: http://chess.com/
*/

var statInfo = {
    chess: {
        name: "Daily",
        icon: "calendar-alt",
        statType: "daily",
        archiveType: "echess",
        fullStatsUrl: "web_stats_daily"
    },
    chess960: {
        name: "Chess 960",
        icon: "chess960",
        statType: "daily",
        fullStatsUrl: "web_stats_daily",
        fullStatType: "chess960"
    },
    bullet: {
        name: "Bullet",
        icon: "bullet",
        statType: "live",
        timeCode: "lightning",
        archiveType: "live_bullet",
        fullStatsUrl: "web_stats_live",
        fullStatType: "bullet"
    },
    lightning: {
        name: "Blitz",
        icon: "lightning",
        statType: "live",
        timeCode: "blitz",
        archiveType: "live_blitz",
        fullStatsUrl: "web_stats_live",
        fullStatType: "blitz"
    },
    rapid: {
        name: "Rapid",
        icon: "circle-timer",
        statType: "live",
        timeCode: "standard",
        archiveType: "live_standard",
        fullStatsUrl: "web_stats_live",
        fullStatType: "rapid"
    },
    liveChess960: {
        name: "Live 960",
        icon: "live960",
        archiveType: "live_chess960"
    },
    tactics: {
        name: "Tactics",
        icon: "chess-board-puzzle",
        fullStatsUrl: "web_stats_tactics"
    },
    lessons: {
        name: "Lessons",
        icon: "chess-board-arrow",
        fullStatsUrl: "web_stats_lessons"
    },
    threecheck: {
        name: "3 Check",
        icon: "threecheck"
    },
    kingofthehill: {
        name: "King of the Hill",
        icon: "kingofthehill"
    },
    crazyhouse: {
        name: "Crazyhouse",
        icon: "crazyhouse"
    },
    bughouse: {
        name: "Bughouse",
        icon: "bughouse"
    }
};

function main(){
	var prefs = AnyBalance.getPreferences();

	var result = {success: true, nick: prefs.nick};

	if(prefs.__dbg_counters){
		result.__dbg_counters = '';
		for(var i in statInfo){
			result.__dbg_counters += '<counter id="' + i + '" name="' + statInfo[i].name + '"/>\n';
		}
		AnyBalance.setResult(result);
		return;
	}

	checkEmpty(prefs.nick, 'Отсутствует ник');
	var baseurl = 'https://www.chess.com/';

	var html = AnyBalance.requestGet(baseurl + 'member/' + prefs.nick);
	
	if (html) {
		if (!html.match(/Member:[^<]+Chess\.com/i)) {
			throw new AnyBalance.Error("Такой ник не найден", null, true);
			}
			
		html = AnyBalance.requestGet(baseurl + 'callback/member/stats/' + prefs.nick);
		var json = getJson(html);
		if(!json.stats){
			AnyBalance.trace(html);
			throw new AnyBalance.Error(json.message);
		}

		AnyBalance.trace('Найдены ' + json.stats.length + ' рейтингов');

		for(var i=0; i<json.stats.length; ++i){
			var stat = json.stats[i];

			AnyBalance.trace('Найден рейтинг ' + statInfo[stat.key].name + ': ' + stat.stats.rating);
			getParam(stat.stats.rating || 0, result, stat.key);

		}
		
		AnyBalance.setResult(result);
	} else {
		AnyBalance.trace(html);
		throw new AnyBalance.Error("Не удалось получить данные");
	}
}