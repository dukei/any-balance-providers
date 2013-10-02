/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Сводная информация о достижениях в игре "Мафия". Отображает количество очков и бабок, рейтинг и позицию в ТОПе.
Провайдер получает эти данные из аккаунта игрока. Для работы требуется указать в настройках логин и пароль.

Личный кабинет: http://wap.didrov.ru/cabinet.php
*/

function setCounterValue(result,html,field) {
	var r = new RegExp(field+'="(.+?)"');
    var matches=r.exec(html);
	if(matches!=null) {
		result[field]=matches[1];
	}
}

function main() {
    var prefs = AnyBalance.getPreferences();
    var html = AnyBalance.requestGet('http://wap.chat.didrov.ru/mafiastat.php?setMarkupType=xml&rm=43&id='+prefs.login+'&ps='+prefs.password);

    var result = {
        success: true
    };
    
    var r = new RegExp('<auth\\s+code="(\\d+)"/>');
    var matches=r.exec(html);
	if(matches==null) throw new AnyBalance.Error('Ошибка разбора страницы 1');
	if(matches[1]!=0) throw new AnyBalance.Error('Ошибка авторизации. Проверьте логин и пароль');
	
	r = new RegExp('<error\\s+code="(\\d+)"(?:(?:/>)|(?:>(.+)</error>))');
    matches=r.exec(html);
	if(matches==null) throw new AnyBalance.Error('Ошибка разбора страницы 2');
	if(matches[1]!=0) throw new AnyBalance.Error('Информация временно недоступна: '+matches[2]);
	
	r = new RegExp('<my.+/>');
    matches=r.exec(html);
	if(matches==null) throw new AnyBalance.Error('Ошибка разбора страницы 3');
	
	setCounterValue(result,html,'cash');
	setCounterValue(result,html,'rating');
	setCounterValue(result,html,'position');
	setCounterValue(result,html,'points');

    AnyBalance.setResult(result);
}