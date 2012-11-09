/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Данные по бонусной карте сети кинотеатров Киномакс.
Провайдер получает эти данные из личного Кабинета. Для работы требуется указать в настройках партнерские логин и пароль.

Сайт сети: http://kinomax.ru/
Личный кабинет: http://kinomax.ru/users/lk/dnk.htm
*/

function main() {
    var prefs = AnyBalance.getPreferences();
    var html = AnyBalance.requestPost('http://kinomax.ru/users/login/', {
        'userEmail':prefs.login,
        'userPassword':prefs.password,
        'login_submit':''
    });

    var result = {
        success: true
    };

	html = AnyBalance.requestGet('http://kinomax.ru/users/lk/dnk.htm');
    var r = new RegExp('<a[^>]+href="/users/logout/">');
	if(r.test(html)) {
		html = AnyBalance.requestGet('http://kinomax.ru/schedule/lk.php');

		r=new RegExp('карта № <b>(\\d+)</b>');
		matches=r.exec(html);
		if(matches==null) throw new AnyBalance.Error("Ошибка получения номера карты.");
		result.card=matches[1];

		r=new RegExp('ФИО: <b>([^<]+)</b>');
		matches=r.exec(html);
		if(matches==null) throw new AnyBalance.Error("Ошибка получения ФИО.");
		result.name=matches[1];

		r=new RegExp('бонусов: <b>Мультикарта (\\d+)%</b></p>');
		matches=r.exec(html);
		if(matches==null) throw new AnyBalance.Error("Ошибка получения уровня накопления бонусов.");
		result.level=parseInt(matches[1]);

		r=new RegExp('<p>Накопительный баланс: <b>(\\d+)руб (\\d+)коп</b></p>');
		matches=r.exec(html);
		if(matches==null) throw new AnyBalance.Error("Ошибка получения накопительного баланса.");
		result.accum=parseInt(matches[1])+parseInt(matches[2])/100;

		r=new RegExp('<p>Активный баланс \\(накопленные бонусы\\): <b>(\\d+)руб (\\d+)коп</b></p>');
		matches=r.exec(html);
		if(matches==null) throw new AnyBalance.Error("Ошибка получения активного баланса.");
		result.active=parseInt(matches[1])+parseInt(matches[2])/100;

	} else {
		throw new AnyBalance.Error('Не удается авторизоваться. Проверьте логин и пароль.');
	}

    AnyBalance.setResult(result);
}