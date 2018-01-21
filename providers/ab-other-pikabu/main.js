var g_headers = {
'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36'
};

function main(){
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('windows-1251');
	checkEmpty(prefs.nickname, 'Введите nickname!');
	var baseurl = 'https://pikabu.ru/profile/';
	var html = AnyBalance.requestGet(baseurl + prefs.nickname, g_headers);
	if(!/Войти/i.test(html)) {
			var error = getParam(html, null, null, /<h1*>Упс[\s\S]*<\/h1>/i); 
			if(error){
				throw new AnyBalance.Error('Проверьте правильность nickname');
			}
			AnyBalance.trace(html); //В непонятных случаях лучше сделать распечатку в лог, чтобы можно было понять, что случилось
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось получить данные. Возможно сайт изменен? или Вы неправильно указали монету');
    }
			
	AnyBalance.trace('Авторизация выполнена, начинаю парсить'); 
	var result = {success: true};
	AB.getParam(html, result, 'raiting', /рейтинг<\/span>[^>]+b-user-profile__value[^>]*>([\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces, parseBalance); 

	 AnyBalance.setResult(result);
}