/*
Провайдер Chess.com (http://chess.com)

Chess.com — Шахматный интернет-клуб
Сайт игры: http://chess.com/
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.nick, 'Отсутствует ник');

	var html = AnyBalance.requestGet('http://www.chess.com/members/view/' + prefs.nick);
	
	if (html) {
		if (html.match(/Members - Chess\.com/i)) {
			throw new AnyBalance.Error("Такой ник не найден");
			}
			
		var obj = {
			live_blitz: "Live Chess - Blitz",
			live_bullet: "Live Chess - Bullet",
			live_standard: "Live Chess - Standard",
			online: "Online Chess",
			chess960: "Chess960",
			tactics: "Tactics",
			mentor: "Chess Mentor"
			}
			
		var game_type = obj[prefs.type];
		
		var result = {success: true};
		
		result.__tariff = prefs.nick;
		
		if (AnyBalance.isAvailable('current')) {
			var tmp_reg = new RegExp('</span>' + game_type + '</h4>[\\s\\S]\*\?<div class="right">(.*?)<span', 'i'); 
			var matches = tmp_reg.exec(html)
			if (matches) {
				if (matches[1] == 'unrated') {
					throw new AnyBalance.Error("Рейтинг " + game_type + " еще не установлен");
				} else if (matches[1] == 'N/A') {
					throw new AnyBalance.Error("Рейтинг " + game_type + " не доступен");
				} else {
					result.current = matches[1];
				}
			} else {
				throw new AnyBalance.Error("У вас нет игр в " + game_type);
			}
		}
		AnyBalance.setResult(result);
	} else {
		throw new AnyBalance.Error("Не удалось получить данные");
	}
}