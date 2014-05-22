/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	Connection: 'keep-alive',
	'User-Agent': 'anyprovider'
};

function main() {
	AnyBalance.trace('Connecting to liveproxy...');
	
	var prefs = AnyBalance.getPreferences();
	
	var info = AnyBalance.requestPost('http://client.liveproxy.com.ua/index.php', {
		login: prefs.login,
		password: prefs.password
	}, g_headers);
	
	var result = {success: true};
	
	var xmlDoc = $.parseXML(info), $xml = $(xmlDoc);
	
	if (AnyBalance.isAvailable('date')) {
		result.date = $xml.find('date').text();
	}
	if (AnyBalance.isAvailable('end')) {
		result.end = $xml.find('end').text();
	}
	if (AnyBalance.isAvailable('fio')) {
		result.fio = $xml.find('fio').text();
	}
	if (AnyBalance.isAvailable('state')) {
		result.state = $xml.find('state').text();
	}
	if ($xml.find('error').text() == 'login') {
		throw new AnyBalance.Error('неправильный логин или пароль 691');
		//result.error = $xml.find('error').text();
	}
	AnyBalance.setResult(result);
}