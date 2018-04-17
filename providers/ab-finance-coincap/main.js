var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	checkEmpty(prefs.coin, 'Введите абривиатуру криптовалюты!');


		var baseurl = 'http://coincap.io/page/';
		
		var html = AnyBalance.requestGet(baseurl + prefs.coin, g_headers);
		
	if(!html || AnyBalance.getLastStatusCode() > 400){
    	AnyBalance.trace(html);
    throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте позже');
    }
	
	if(!/price_usd/i.test(html)){

        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = AB.getParam(html, null, null, /error/i, AB.replaceTagsAndSpaces);
        if(error){
            //При выкидывании ошибки входа третьим параметром передаём проверку на то, что это ошибка неправильного пароля. 
            //Если третий параметр true, то AnyBalance прекратит обновления до тех пор, пока пользователь не изменит настройки.
            //Это важно, а то постоянные попытки обновления с неправильным паролем могут заблокировать кабинет.
            throw new AnyBalance.Error(error, null, /Вы ввели неизвестный ID монеты/i.test());
        }
		AnyBalance.trace(html); //В непонятных случаях лучше сделать распечатку в лог, чтобы можно было понять, что случилось
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось получить данные. Возможно сайт изменен? или Вы неправильно указали монету');
    }
	var result = {success: true};
    AB.getParam(html, result, 'priceUSD', /"price_usd":[\s\S]*?([\s\S]*?),/i, AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, 'priceBTC', /"price_btc":[\s\S]*?([\s\S]*?),/i, AB.replaceTagsAndSpaces, AB.parseBalance);

    
    AnyBalance.setResult(result);
}