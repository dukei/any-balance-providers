function checkEmpty(param, error) {
    if (!param || param == '')
        throw new AnyBalance.Error(error);
}

function getData(url) {
	var data = AnyBalance.requestGet(url);
	if (data){
		var code = data.match(/<title>(.+?)<\/title>/i);
		if (code){
			throw new AnyBalance.Error(code[1]);
		} else {
			var js = $.parseJSON(data);
			var st =  js.status
			if (st == 'ok'){
				return js;
			} else if (st == 'error'){
				var err = js.error
				throw new AnyBalance.Error('Ошибка: ' + err);
			} else {
				throw new AnyBalance.Error('Неизвестный ответ сервера: ' + st);
			}
		}
	} else {
		throw new AnyBalance.Error('Неизвестная ошибка');
	}
}

function getID(nick) {
	var v = getData('http://worldoftanks.ru/uc/accounts/api/1.0/?source_token=WG-WoT_Assistant-1.1.2&search=' + nick + '&offset=0&limit=1');
	return v.data.items[0].id;
}