/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

LinguaLeo - сервис изучения английского языка
Сайт сервиса: http://lingualeo.ru/
**/

function main(){
	var prefs = AnyBalance.getPreferences();
	if (!prefs.email || prefs.email == '')
		throw new AnyBalance.Error ('Введите e-mail');
	if (!prefs.password || prefs.password == '')
		throw new AnyBalance.Error ('Введите пароль');
	AnyBalance.requestPost('http://lingualeo.ru/meatballs', {
		email: prefs.email,
		password: prefs.password
	});
	var html = AnyBalance.requestGet('http://lingualeo.ru/meatballs');
	if (html) {
		var result = {success: true};
		
		result.__tariff = html.match(/<a href="\/profile">(.+?)<\/a>/i)[1];
		
		if (AnyBalance.isAvailable('meatballs')) {
			var matches = html.match(/<span data-current-meatballs>(\d+?)<\/span>/i);
			if (matches) {
				result.meatballs = matches[1]
			} else {
				throw new AnyBalance.Error("Не удалось проверить фрикадельки");
			}
		}
		if (AnyBalance.isAvailable('level')) {
			var matches = html.match(/<span data-level-number>(\d+?)<\/span>/i);
			if (matches) {
				result.level = matches[1]
			} else {
				throw new AnyBalance.Error("Не удалось получить текущий уровень");
			}
		}
		if (AnyBalance.isAvailable('xp')) {
			var matches = html.match(/<div class="progress-bar" data-xp-progressbar style="width: (\d+?)%">/i);
			if (matches) {
				result.xp = matches[1]
			} else {
				throw new AnyBalance.Error("Не удалось получить текущий опыт");
			}
		}
		AnyBalance.setResult(result);
	} else {
		throw new AnyBalance.Error("Не удалось получить данные");
	}
}