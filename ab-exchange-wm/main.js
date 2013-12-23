/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function getRate(result, info) {
	var kurs = [];
	$('tr.evenRowIndxView, tr.oddRowIndxView', info).each(function() {
		kurs.push(1 * $('td:eq(3)', this).text().replace(',', '.'));
	});
	result['WMZWMR'] = kurs[0];
	result['WMRWMZ'] = kurs[1];
	result['WMZWME'] = kurs[2];
	result['WMEWMZ'] = kurs[3];
	result['WMEWMR'] = kurs[4];
	result['WMRWME'] = kurs[5];
	result['WMZWMU'] = kurs[6];
	result['WMUWMZ'] = kurs[7];
	result['WMRWMU'] = kurs[8];
	result['WMUWMR'] = kurs[9];
	result['WMUWME'] = kurs[10];
	result['WMEWMU'] = kurs[11];
	result['WMBWMZ'] = kurs[12];
	result['WMZWMB'] = kurs[13];
	result['WMBWME'] = kurs[14];
	result['WMEWMB'] = kurs[15];
	result['WMRWMB'] = kurs[16];
	result['WMBWMR'] = kurs[17];
}

function main(){
    if (AnyBalance.getLevel() < 5)
		throw new AnyBalance.Error("Для этого провайдера необходимо AnyBalance API v.5+");
		
	AnyBalance.trace('Connecting to http://wm.exchanger.ru/asp/default.asp...');
	var info = AnyBalance.requestGet('http://wm.exchanger.ru/asp/default.asp');
	var result = {success: true};
	getRate(result, info);
	AnyBalance.setResult(result);
}