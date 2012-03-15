/*
Провайдер Chess.com (http://chess.com)

Chess.com — Шахматный интернет-клуб
Сайт игры: http://chess.сщь/
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.nick, 'Отсутствует ник');

	var html = AnyBalance.requestGet('http://www.chess.com/echess/mobile-stats/' + prefs.nick);
	
	if (html) {
		var result = {success: true};
		if (html.match(/Members - Chess\.com/i)) {
			throw new AnyBalance.Error("Такой ник не найден");
			}
		if (prefs.type == 'o_standart') {
			var matches = html.match(/<span style="font-weight: bold; font-size: 1\.6em;">(.+?)<\/span>/i);
		} else if (prefs.type == 'chess960') {
			var matches = html.match(/Chess960[\s\S]*?<span style="font-weight: bold; font-size: 1\.6em;">(.+?)<\/span>/i);
		}
		if (matches) {
			if (matches[1] == 'unrated') {
				throw new AnyBalance.Error('Unrated');
			} else {
				result.current = matches[1];
			}
		} else {
			throw new AnyBalance.Error("Не удалось получить текущий рейтинг");
		}
		AnyBalance.setResult(result);
	} else {
		throw new AnyBalance.Error("Не удалось получить данные");
	}
}