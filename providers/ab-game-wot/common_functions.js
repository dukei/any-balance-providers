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
				var err = js.error.message
				throw new AnyBalance.Error('Error: ' + err);
			} else {
				throw new AnyBalance.Error('Unknown server response: ' + st);
			}
		}
	} else {
		throw new AnyBalance.Error('Unknown error');
	}
}

function getID(nick, API_ADDR, APP_ID) {
	var v = getData(API_ADDR + '/2.0/account/list/?application_id=' + APP_ID + '&search=' + nick + '&limit=1');
	if (v.data[0]) {
		return v.data[0].account_id;
	} else {
		throw new AnyBalance.Error('ID not found! Check your settings.');
	}
}

function stat_rnd(fld, stat) {
	return stat['all'][fld] - stat['clan'][fld] - stat['company'][fld];
}