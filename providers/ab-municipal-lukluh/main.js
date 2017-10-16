
function main() {

var prefs = AnyBalance.getPreferences();
var login = prefs.login;
var pass = prefs.password;

var info = AnyBalance.requestPost('http://lk.lukluh.ru/inner.php',
{
wlogin: login,
wpassw: pass
});

info = AnyBalance.requestGet('http://lk.lukluh.ru/inner.php');
//AnyBalance.trace(info);

var result = {success: true};

// Счетчики с первой страницы
//AnyBalance.trace("Начисленно");
	getParam(info, result, 'nachisleno', /<td class="ct_td"><p>([^"]*)руб./i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'debt', /Долг<\/td><td class="ct_td">([^"]*)руб./i, replaceTagsAndSpaces, parseBalance);
//AnyBalance.trace("Лицевой счет");
	getParam(info, result, '__tariff', /ФЛС:([^"]*)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(info, result, 'period', /Ваш лицевой счёт \(информация на([^"]*)\)</i, replaceTagsAndSpaces, html_entity_decode);
info = AnyBalance.requestGet('http://lk.lukluh.ru/inner.php?hms=2');
//AnyBalance.trace(info);
// Счетчики со второй страницы
	getParam(info, result, 'vznos', /кап.рем<\/td><td>.*?<\/td><td>(.*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'otoplen', /Гкал<\/td><td>.*?<\/td><td>(.*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'soderjanie', /ТБО<\/td><td>.*?<\/td><td>(.*?)</i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'peni', /Пени<\/td><td>.*?<\/td><td>(.*?)</i, replaceTagsAndSpaces, parseBalance);

AnyBalance.setResult(result);

}
