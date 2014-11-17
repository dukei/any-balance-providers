/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main() {
	var info = AnyBalance.requestGet('http://obmenka.kharkov.ua');
	
	if(!info || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	var result = {success: true};
	
	getParam(info, result, 'USDpok', /Доллар\/Гривна([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'USDpro', /Доллар\/Гривна([^>]*>){5}/i, replaceTagsAndSpaces, parseBalance);
	
	getParam(info, result, 'EURpok', /Евро\/Гривна([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'EURpro', /Евро\/Гривна([^>]*>){5}/i, replaceTagsAndSpaces, parseBalance);
	
	getParam(info, result, 'RUBpok', /Рубль\/Гривна([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'RUBpro', /Рубль\/Гривна([^>]*>){5}/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}