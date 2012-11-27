/*
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Godville — многопользовательская бесплатная игра жанра ZPG
Сайт http://godville.net/
*/

function main(){
	var prefs = AnyBalance.getPreferences();

	if (!prefs.login || prefs.login == '')
		throw new AnyBalance.Error('Введите ваше имя бога');

	var pd = AnyBalance.requestGet('http://godville.net/gods/api/' + prefs.login.replace(' ', '%20') + '.json');

	if(!pd || pd == '')
		throw new AnyBalance.Error('Не удалось получить данные');

	if(pd == 'Not found')
		throw new AnyBalance.Error('Герой не найден');

	var js = $.parseJSON(pd);

	var result = {success: true};
	
	var hname = js.name;

	result.__tariff = hname;

	if(AnyBalance.isAvailable('name'))
		result['name'] = hname;

	if(AnyBalance.isAvailable('level'))
		result['level'] = js.level;

	if(AnyBalance.isAvailable('health'))
		result['health'] = js.health;

	if(AnyBalance.isAvailable('health_p'))
		result['health_p'] = ((js.health / js.max_health) * 100).toFixed(1);

	if(AnyBalance.isAvailable('health_t'))
		result['health_t'] = js.health + "/" +  js.max_health;

	if(AnyBalance.isAvailable('bricks_p'))
		result['bricks_p'] = js.bricks_cnt / 10;

	if(AnyBalance.isAvailable('bricks'))
		result['bricks'] = js.bricks_cnt;

	if(AnyBalance.isAvailable('godpower'))
		result['godpower'] = js.godpower;

	AnyBalance.setResult(result);

}