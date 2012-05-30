/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Статистика посещаемости по данным MobTop

Сайт: http://mobtop.ru/
*/

function main() {
    var prefs = AnyBalance.getPreferences();
    var xml = AnyBalance.requestGet('http://api.mobtop.ru/'+prefs.id+'/visitors_offset/1');

    var result = {
        success: true
    };

	var r = new RegExp('<hits>(\\d+)</hits>','g');
	var matches=r.exec(xml);
	if(matches==null) throw new AnyBalance.Error('Невозможно получить хиты за сегодня');
	result.hits_today=parseInt(matches[1]);

	matches=r.exec(xml);
	if(matches==null) throw new AnyBalance.Error('Невозможно получить хиты за вчера');
	result.hits_yesterday=parseInt(matches[1]);

	r = new RegExp('<hosts>(\\d+)</hosts>','g');
	matches=r.exec(xml);
	if(matches==null) throw new AnyBalance.Error('Невозможно получить хосты за сегодня');
	result.hosts_today=parseInt(matches[1]);

	matches=r.exec(xml);
	if(matches==null) throw new AnyBalance.Error('Невозможно получить хосты за вчера');
	result.hosts_yesterday=parseInt(matches[1]);

    AnyBalance.setResult(result);
}