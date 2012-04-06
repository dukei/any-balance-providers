/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Сільпо - Мережа супермаркетів
Сайт Сільпо: http://http://silpo.ua
Персональная страничка: https://my.silpo.ua/
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	var authPwd = prefs.pass;
	var authBarcode = prefs.login;
	if (!prefs.login || prefs.login == '')
		throw new AnyBalance.Error ('Введите № карты');
	if (!prefs.pass || prefs.pass == '')
		throw new AnyBalance.Error ('Введите пароль');
	var html = AnyBalance.requestPost('https://my.silpo.ua/login', {
			authBarcode: prefs.login,
			authPwd: prefs.pass,
			authRememberMe: "0"
		}
		//, 
		//Приходится указывать юзерагент, иначе их сервер падает
		//{"User-Agent":"Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.142 Safari/535.19"}
	);
	if (html){
		var result = {success: true};
		if (AnyBalance.isAvailable('bonus')) {
			//AnyBalance.trace(html); //С помощью этого на телефоне в окне "показать последний лог" можно увидеть, какой тут html
			var matches = html.match(/<div class="bottom">\s*Загальна кількість\s*<div>(\d+?)<\/div>/i);
			if (matches) {
				result.bonus = parseFloat(matches[1]);
			} else {
				throw new AnyBalance.Error("Не удалось проверить бонусы");
			}
		}
		AnyBalance.setResult(result);
	} else {
		throw new AnyBalance.Error('Не удалось получить данные');
	}
}
