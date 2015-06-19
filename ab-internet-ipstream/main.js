function main(){
  //Получим настройки аккаунта
  var prefs = AnyBalance.getPreferences();

  //Получаем значения счетчиков
  //что-то для этого делаем
  
  
  var url = 'https://bs.ip-stream.ru/api/';
  var strPost = AnyBalance.requestPost(url, {login: prefs.login, password: prefs.password});

  if(!strPost || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
  if (/error/i.test(strPost))
		throw new AnyBalance.Error('Неверный логин или пароль');
	
  //извлекаем из строк значения счетчиков
  //...
	arr=strPost.split('|');
	
	tariff=arr[0];
	balance=arr[1];
  //Возвращаем результат
  AnyBalance.setResult({success: true, __tariff: tariff, balance: balance});
}