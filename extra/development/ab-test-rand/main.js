/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.trace('Starting test provider...');
	
	if(prefs.bad_behavior) {
		AnyBalance.trace('Bad behavior selected');
		bad/100;
	}
	
	var result = {
		success: true,
		balance: null,
		date: null,
		text_counter: null,
		currency: ' р',
		hidden: 'hidden counter' // счетчик, который не объявлен в манифесте и он нигде не используется
	};
	
	AnyBalance.trace('result is: ' + JSON.stringify(result));
	
	if(!prefs.return_null) {
		AnyBalance.trace('Returning normal values');
		getParam((Math.random() * 10000).toFixed(2) + '', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
		getParam((Math.random() * 10).toFixed(0) + '', result, 'balance2', null, replaceTagsAndSpaces, parseBalance);
		getParam((Math.random() * 10000).toFixed(2) + '', result, 'text_counter');
		getParam(getRandomInt(1, 31) + '.11.2015', result, 'date', null, replaceTagsAndSpaces, parseDate);
	}
	
	AnyBalance.trace('Testing getData');
	
	var data = AnyBalance.getData('test_data_json', 'def_val');
	if(data == 'def_val') {
		AnyBalance.trace('Setting data at first time...');
		AnyBalance.setData('test_data_json', JSON.stringify({
			'int': 1,
			'bool': true,
			'array': ['1', '2', '3', '4', '5'],
			'object': {'k' : 'v'},
			'string': 'test'
		}));
		
		AnyBalance.trace('Saving data...');
		AnyBalance.saveData();
		AnyBalance.trace('Data saved.');
	} else {
		AnyBalance.trace('data is: ' + JSON.stringify(data));
	}
	
	AnyBalance.setResult(result);
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}