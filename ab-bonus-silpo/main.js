/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Сільпо - Мережа супермаркетів
Сайт Сільпо: http://http://silpo.ua
Персональная страничка: https://my.silpo.ua/
*/

function main(){
	var baseurl = 'https://my.silpo.ua/';
	var prefs = AnyBalance.getPreferences();
	var authPwd = prefs.pass;
	var authBarcode = prefs.login;
	if (!prefs.login || prefs.login == '')
		throw new AnyBalance.Error ('Введите № карты');
	if (!prefs.pass || prefs.pass == '')
		throw new AnyBalance.Error ('Введите пароль');
	var html = AnyBalance.requestPost(baseurl + 'login', {
			authBarcode: prefs.login,
			authPwd: prefs.pass,
			authRememberMe: "0"
		}
		, 
		//Она ожидает, что запрос на логин будет сделан через JavaScript, поэтому надо установить этот заголовок
		//Вообще, если не получается залогиниться просто передав логин и пароль, то надо смотреть, не устанавливаются ли при запросе какие-нибудь
		//Дополнительные заголовки или куки
		{"X-Requested-With":"XMLHttpRequest"}
	);
	if (html == "1"){ //Если авторизация успешна, то возвращается просто один
		//Переходим на аккаунт
		html = AnyBalance.requestGet(baseurl + 'account');
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
	} else { //А если неуспешна, то надо в этом html найти и вывести ошибку!
		throw new AnyBalance.Error('Не удалось получить данные');
	}
}
